import Foundation

// AppKit's small drawing vocabulary, recorded for Canvas2D. No simulation code here.
#if os(WASI)
typealias CGFloat = Double
#endif
struct NSPoint {var x:CGFloat;var y:CGFloat}
struct NSRect {
    var minX:CGFloat;var minY:CGFloat;var width:CGFloat;var height:CGFloat
    init(x:CGFloat,y:CGFloat,width:CGFloat,height:CGFloat){minX=x;minY=y;self.width=width;self.height=height}
    var midX:CGFloat{minX+width/2};var midY:CGFloat{minY+height/2}
    var maxX:CGFloat{minX+width};var maxY:CGFloat{minY+height}
    func contains(_ p:NSPoint)->Bool{p.x>=minX && p.x<maxX && p.y>=minY && p.y<maxY}
    func intersects(_ r:NSRect)->Bool{minX<r.maxX && maxX>r.minX && minY<r.maxY && maxY>r.minY}
    func insetBy(dx:CGFloat,dy:CGFloat)->NSRect{.init(x:minX+dx,y:minY+dy,width:width-2*dx,height:height-2*dy)}
    func fill(){Canvas.commands.append(["fill",minX,minY,width,height,Canvas.fill])}
    static let zero=NSRect(x:0,y:0,width:0,height:0)
}
struct NSColor {
    let r:Double,g:Double,b:Double,a:Double
    init(hex:String){let n=UInt32(hex.replacingOccurrences(of:"#",with:""),radix:16) ?? 0;r=Double((n>>16)&255);g=Double((n>>8)&255);b=Double(n&255);a=1}
    init(_ r:Double,_ g:Double,_ b:Double,_ a:Double){self.r=r;self.g=g;self.b=b;self.a=a}
    var css:String{"rgba(\(r),\(g),\(b),\(a))"}
    func withAlphaComponent(_ v:CGFloat)->NSColor{NSColor(r,g,b,Double(v))}
    func setFill(){Canvas.fill=css};func setStroke(){Canvas.stroke=css}
    static let clear=NSColor(0,0,0,0),orange=NSColor(255,149,0,1),white=NSColor(255,255,255,1),black=NSColor(0,0,0,1)
}
struct NSGradient {
    let start:NSColor,end:NSColor
    init?(starting:NSColor,ending:NSColor){start=starting;end=ending}
    func draw(in r:NSRect,angle:CGFloat){Canvas.commands.append(["gradient",r.minX,r.minY,r.width,r.height,start.css,end.css,angle])}
}
final class NSBezierPath {
    var lineWidth:CGFloat=1
    var parts:[[Any]]=[]
    init(){}
    convenience init(rect:NSRect){self.init();parts=[["rect",rect.minX,rect.minY,rect.width,rect.height]]}
    convenience init(roundedRect r:NSRect,xRadius:CGFloat,yRadius:CGFloat){self.init();parts=[["round",r.minX,r.minY,r.width,r.height,xRadius,yRadius]]}
    convenience init(ovalIn r:NSRect){self.init();parts=[["ellipse",r.minX,r.minY,r.width,r.height]]}
    func move(to p:NSPoint){parts.append(["move",p.x,p.y])}
    func line(to p:NSPoint){parts.append(["line",p.x,p.y])}
    func close(){parts.append(["close"])}
    func stroke(){Canvas.commands.append(["path",parts,Canvas.stroke,lineWidth,false])}
    func fill(){Canvas.commands.append(["path",parts,Canvas.fill,lineWidth,true])}
}
enum Canvas {static var commands:[[Any]]=[];static var fill="black",stroke="white"}

final class Database {
    let root:URL
    var teams:[Team]=[],players:[Player]=[],coaches:[Coach]=[]
    static var input:[String:String]=[:]
    init(root:URL){self.root=root;_ = reload()}
    func read<T:Decodable>(_ file:String,as:T.Type)->T?{guard let text=Self.input[file],let data=text.data(using:.utf8)else{return nil};return try? JSONDecoder().decode(T.self,from:data)}
    @discardableResult func reload()->Bool{guard let t=read("Data/teams.json",as:[Team].self),t.count==7,let p=read("Data/players.json",as:[Player].self),!p.isEmpty else{return false};teams=t;players=p;coaches=read("Data/staff.json",as:[Coach].self) ?? [];return true}
    func roster(_ index:Int)->[Player]{players.filter{$0.teamID==teams[index].id}}
    func lineup(_ index:Int)->[Player]{Array(roster(index).filter{$0.position != "P"}.sorted{($0.stats?.pa ?? 0)>($1.stats?.pa ?? 0)}.prefix(9))}
}
// Raw strings preserve UInt64 seeds; browser storage must never parse these as JS Numbers.
enum BrowserStorage {
    static var files:[String:String]=[:]
    static var changed:[String:String]=[:]
    static func put(_ key:String,_ value:String){files[key]=value;changed[key]=value}
}
struct FranchiseStore {
    let directory:URL
    func save(_ career:Franchise)throws {
        guard (1...3).contains(career.slot),career.validate() else{throw NSError(domain:"Franchise",code:1,userInfo:[NSLocalizedDescriptionKey:"Save validation failed; previous save was preserved."])}
        let key="franchise-\(career.slot).json",data=try JSONEncoder().encode(career)
        if let old=BrowserStorage.files[key]{BrowserStorage.put(key+".bak",old)}
        BrowserStorage.put(key,String(decoding:data,as:UTF8.self))
    }
    func load(_ slot:Int)throws->Franchise {
        for key in ["franchise-\(slot).json","franchise-\(slot).json.bak"] {
            if let raw=BrowserStorage.files[key],let c=try? JSONDecoder().decode(Franchise.self,from:Data(raw.utf8)),c.validate(){return c}
        }
        throw NSError(domain:"Franchise",code:2,userInfo:[NSLocalizedDescriptionKey:"No valid career save in this slot."])
    }
}
struct FranchiseInterfacePreferences:Codable {
    var showCareerTour=true
    static func read(from directory:URL)->Self{guard let raw=BrowserStorage.files["interface-preferences.json"],let p=try? JSONDecoder().decode(Self.self,from:Data(raw.utf8))else{return Self()};return p}
    func write(to directory:URL)throws{BrowserStorage.put("interface-preferences.json",String(decoding:try JSONEncoder().encode(self),as:UTF8.self))}
}
