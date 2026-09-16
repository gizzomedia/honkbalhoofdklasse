import Foundation

var gameView:FranchiseView?
var bridgeOutput:UnsafeMutablePointer<UInt8>?
var bridgeOutputCount:Int32=0

@_cdecl("hk_alloc")
public func hk_alloc(_ count:Int32)->UnsafeMutablePointer<UInt8>{UnsafeMutablePointer<UInt8>.allocate(capacity:Int(count))}
@_cdecl("hk_free")
public func hk_free(_ ptr:UnsafeMutablePointer<UInt8>){ptr.deallocate()}
@_cdecl("hk_result_length")
public func hk_result_length()->Int32{bridgeOutputCount}
@_cdecl("hk_dispatch")
public func hk_dispatch(_ ptr:UnsafePointer<UInt8>,_ count:Int32)->UnsafeMutablePointer<UInt8>{
    let input=Data(bytes:ptr,count:Int(count))
    let result:[String:Any]
    do {
        guard let request=try JSONSerialization.jsonObject(with:input) as? [String:Any] else{throw BridgeError.invalid}
        result=try dispatch(request)
    }catch{result=["error":error.localizedDescription]}
    let data=(try? JSONSerialization.data(withJSONObject:result,options:[.sortedKeys,.fragmentsAllowed])) ?? Data("{\"error\":\"Serialization failed\"}".utf8)
    bridgeOutput?.deallocate();let output=UnsafeMutablePointer<UInt8>.allocate(capacity:data.count)
    data.copyBytes(to:output,count:data.count);bridgeOutput=output;bridgeOutputCount=Int32(data.count);return output
}
enum BridgeError:Error{case invalid,notInitialized}
func dispatch(_ req:[String:Any])throws->[String:Any]{
    let op=req["op"] as? String ?? "draw"
    if op=="init" {
        Database.input=req["data"] as? [String:String] ?? [:]
        BrowserStorage.files=req["files"] as? [String:String] ?? [:];BrowserStorage.changed=[:]
        let db=Database(root:URL(fileURLWithPath:"/"))
        guard db.teams.count==7,db.players.count>0 else{throw BridgeError.invalid}
        gameView=FranchiseView(frame:NSRect(x:0,y:0,width:1600,height:900),db:db,saveDirectory:URL(fileURLWithPath:"/saves"))
        if let offset=req["photoOffset"] as? Int{gameView!.photoOffset=offset}
    }
    guard let v=gameView else{throw BridgeError.notInitialized}
    switch op {
    case "pointer":v.pointer(req["x"] as? Double ?? -1,req["y"] as? Double ?? -1,click:req["click"] as? Bool ?? false)
    case "key":v.key(req["code"] as? Int ?? 0,req["characters"] as? String ?? "",shift:req["shift"] as? Bool ?? false)
    case "focus":v.focus=max(0,min(v.areas.count-1,req["index"] as? Int ?? 0));v.hover = -1
    case "action":
        if let action=req["action"] as? String,v.areas.contains(where:{$0.action==action}){v.act(action)}
    case "tick":v.tick()
    case "pause":v.stop()
    case "import":
        guard let raw=req["payload"] as? String,let slot=req["slot"] as? Int,(1...3).contains(slot),var f=try? JSONDecoder().decode(Franchise.self,from:Data(raw.utf8)),f.validate()else{throw BridgeError.invalid}
        f.slot=slot;try v.store.save(f);v.stop();v.career=nil;v.page="careers";v.modal=""
    case "validate":
        guard let raw=req["payload"] as? String,let f=try? JSONDecoder().decode(Franchise.self,from:Data(raw.utf8)),f.validate(),(1...3).contains(f.slot)else{throw BridgeError.invalid}
        return ["valid":true,"slot":f.slot,"year":f.year]
    case "export":
        guard let slot=req["slot"] as? Int,let raw=BrowserStorage.files["franchise-\(slot).json"]else{throw BridgeError.invalid};return ["payload":raw]
    #if PORT_TEST
    case "capture":referenceCapture(v,req["index"] as? Int ?? 0)
    case "fixtures":return ["fixtures":try referenceFixtures(v.db)]
    case "testState":
        if let raw=req["payload"] as? String {v.career=try JSONDecoder().decode(Franchise.self,from:Data(raw.utf8))}
        v.page=req["page"] as? String ?? "hub";v.tab=req["tab"] as? Int ?? 0;v.modal=req["modal"] as? String ?? "";v.tourStep=nil;v.toastUntil=0;v.clock=0;v.photoOffset=0
        if let f=v.career{v.selectedDay=f.day;v.syncMonth()}
    #endif
    default:break
    }
    if op=="tick" && !v.needsDisplay{return ["idle":true]}
    v.draw(.zero);v.needsDisplay=false
    let changes=BrowserStorage.changed;BrowserStorage.changed=[:]
    return ["commands":Canvas.commands,"areas":v.areas.map{["rect":[$0.rect.minX,$0.rect.minY,$0.rect.width,$0.rect.height],"action":$0.action,"label":$0.label] as [String:Any]},"files":changes,"page":v.page,"tab":v.tab,"modal":v.modal,"autoSim":v.autoSim,"focus":v.focus,"toast":v.clock<v.toastUntil ? v.toast:"","day":v.career?.day ?? 0,"slot":v.career?.slot ?? 0]
}
#if PORT_TEST
func referenceFixtures(_ db:Database)throws->[String:String]{
    var result:[String:String]=[:]
    func record(_ f:Franchise,_ name:String)throws{var fixed=f;fixed.created=Date(timeIntervalSince1970:0);fixed.lastSaved=Date(timeIntervalSince1970:0);let encoder=JSONEncoder();encoder.outputFormatting=[.sortedKeys];result[name]=String(decoding:try encoder.encode(fixed),as:UTF8.self)}
    for club in 0..<7{try record(Franchise.make(db:db,user:club,slot:1,fantasy:false,seed:260916),"opening-\(club)")}
    var f=Franchise.make(db:db,user:0,slot:1,fantasy:false,seed:260916);f.options.injuryFrequency=0
    let hitter=f.roster(0).first{$0.canHit && !$0.isPitcher}!
    _=f.assignTraining(hitter.profile.id,ability:1,intensity:1);_=f.completeTraining();try record(f,"training")
    let g=f.nextUserGame!;f.advanceTime(g.day);f.simulate(g.id);try record(f,"first-game")
    _=f.signSponsor("action",slot:0);_=f.orderMerchandise(0);_=f.hireCoach(f.coachingCandidates(0)[0]);try record(f,"commercial")
    for _ in 0..<600{if f.champion != nil{break};_=f.step()};try record(f,"season-complete")
    _=f.nextSeason();try record(f,"next-season")
    var draft=Franchise.make(db:db,user:3,slot:2,fantasy:true,seed:260916)
    while draft.draft{draft.draftBest()};try record(draft,"fantasy-draft")
    return result
}
#endif
