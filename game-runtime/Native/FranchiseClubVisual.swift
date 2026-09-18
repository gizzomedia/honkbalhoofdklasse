import AppKit
import Foundation

extension FranchiseView {
    // A schematic of the managed facilities, not a claim to surveyed stadium geometry.
    // All geometry is derived from the saved levels; preview uses a value copy only.
    func clubComplex(_ frame:NSRect,_ c:FranchiseClub,selected:Int,projects:ClubInvestmentState,preview:Bool=false){
        func point(_ x:CGFloat,_ y:CGFloat)->NSPoint{NSPoint(x:frame.minX+x*frame.width/1000,y:frame.minY+y*frame.height/500)}
        func polygon(_ coords:[(CGFloat,CGFloat)],_ color:NSColor){guard let first=coords.first else{return};let path=NSBezierPath();path.move(to:point(first.0,first.1));for p in coords.dropFirst(){path.line(to:point(p.0,p.1))};path.close();color.setFill();path.fill()}
        func stroke(_ coords:[(CGFloat,CGFloat)],_ color:NSColor,_ width:CGFloat=1){guard let first=coords.first else{return};let path=NSBezierPath();path.move(to:point(first.0,first.1));for p in coords.dropFirst(){path.line(to:point(p.0,p.1))};path.lineWidth=width*frame.width/1000;color.setStroke();path.stroke()}
        func label(_ name:String,_ x:CGFloat,_ y:CGFloat,_ width:CGFloat,_ color:NSColor){let p=point(x,y);text(name,p.x,p.y,15*frame.width/1000,color,"AvenirNextCondensed-Heavy",width*frame.width/1000)}
        let grass=NSColor(hex:"214D43"),clay=NSColor(hex:"A27959"),road=NSColor(hex:"34434A"),future=NSColor(hex:"E5C583")
        polygon([(30,395),(485,488),(970,310),(515,23)],NSColor(hex:"0A2028"))
        stroke([(60,371),(500,455),(914,310),(525,67),(90,224)],road,13)
        polygon([(460,350),(241,191),(330,109),(460,75),(590,109),(680,191)],grass)
        for i in 0..<5 {let d=CGFloat(i)*24;stroke([(293+d,166-d*0.29),(554+d,261-d*0.29)],white.withAlphaComponent(0.035),20)}
        polygon([(460,350),(375,286),(460,222),(545,286)],clay)
        polygon([(460,333),(398,286),(460,239),(522,286)],NSColor(hex:"31634D"))
        stroke([(236,188),(460,354),(685,188)],white.withAlphaComponent(0.85),2)
        stroke([(460,343),(380,286),(460,227),(540,286),(460,343)],white.withAlphaComponent(0.75),1.2)
        for (x,y) in [(CGFloat(460),CGFloat(341)),(380,286),(460,227),(540,286)] {polygon([(x-4,y),(x,y-3),(x+4,y),(x,y+3)],white)}
        polygon([(451,287),(460,281),(469,287),(460,293)],clay)
        stroke([(241,191),(330,109),(460,75),(590,109),(680,191)],accent.withAlphaComponent(0.85),5)
        // Four baseline grandstand sections plus one new 300-seat section per stadium level.
        for i in 0..<16 {
            let angle=Double(28+i*8)*Double.pi/180
            let x=CGFloat(460+255*cos(angle)),y=CGFloat(213+203*sin(angle))
            let built=i<4+c.stadium
            let color=built ? (selected==0 ? (preview && i==3+c.stadium ? future:accent):NSColor(hex:"68838B")):road.withAlphaComponent(0.36)
            polygon([(x-18,y),(x+13,y-8),(x+22,y+5),(x-9,y+14)],built ? color.withAlphaComponent(0.82):color)
            if built {polygon([(x-9,y+14),(x+22,y+5),(x+22,y+14),(x-9,y+23)],color.withAlphaComponent(0.38));for r in 0..<3 {stroke([(x-14+CGFloat(r)*3,y+CGFloat(r)*4),(x+14+CGFloat(r)*2,y-7+CGFloat(r)*4)],white.withAlphaComponent(0.5),1)}}
        }
        label("01 / BALLPARK · \(number(c.capacity)) SEATS",340,448,400,selected==0 ? accent:muted)
        let locations:[(CGFloat,CGFloat)]=[(115,322),(148,214),(201,115),(720,119),(801,212),(834,318),(673,405),(408,43)]
        let names=["LOCKER ROOM","ACADEMY","MEDICAL","ANALYSIS","BATTING CAGES","PITCHING LAB","FAN ZONE","FARM CAMPUS"]
        for i in 1..<9 {
            let (x,y)=locations[i-1],level=c.level(i),height=CGFloat(10+level*3)
            let color=selected==i ? (preview ? future:accent):NSColor(hex:"64808A")
            polygon([(x-44,y),(x+16,y+17),(x+60,y-8),(x,y-25)],road)
            polygon([(x-44,y),(x+16,y+17),(x+16,y+17-height),(x-44,y-height)],color.withAlphaComponent(0.34))
            polygon([(x+16,y+17),(x+60,y-8),(x+60,y-8-height),(x+16,y+17-height)],color.withAlphaComponent(0.55))
            polygon([(x-44,y-height),(x+16,y+17-height),(x+60,y-8-height),(x,y-25-height)],color.withAlphaComponent(level==0 ? 0.42:0.9))
            for j in 0..<level {let yy=y-height+CGFloat(j)*2.6;stroke([(x-39,yy+4),(x+12,yy+19)],white.withAlphaComponent(0.5),1)}
            if selected==i {stroke([(x-53,y+3),(x+16,y+25),(x+68,y-7)],preview ? future:accent,2)}
            label("0\(i+1) / "+names[i-1],x-78,y+31,210,selected==i ? accent:muted)
            label("LEVEL \(level)",x-78,y+49,150,white)
        }
        // Permanent project buildings remain visible even when upkeep is temporarily unfunded.
        for (i,p) in clubProjects.enumerated() {
            let done=projects.completed.contains(p.id),building=projects.construction?.id==p.id
            guard done || building else{continue}
            let x:CGFloat=34+CGFloat(i)*236,y:CGFloat=481
            let color=building ? future:projects.funded ? green:muted
            stroke([(x,y+9),(x+8,y),(x+16,y+9),(x+16,y+17),(x,y+17),(x,y+9)],color,2)
            label(p.name.components(separatedBy:" & ").first!.uppercased()+(building ? " · BUILDING":""),x+23,y+2,209,color)
        }
    }
    func clubProjectCaption(_ f:Franchise)->String {
        if let site=f.investments.construction,let project=clubProjects.first(where:{$0.id==site.id}){return "BUILDING: \(project.name.uppercased()) · \(max(0,site.finish-f.careerDay)) DAYS LEFT"}
        return f.investments.completed.isEmpty ? "Your club starts here. Select a facility to plan its next chapter.":"\(f.investments.completed.count) COMPLETED PROJECTS · "+(f.investments.funded ? "BENEFITS ACTIVE":"UPKEEP UNFUNDED · BENEFITS PAUSED")
    }
    func visualClub(){guard let f=career else{return};let c=f.clubs[f.user],i=clubFacility,level=c.level(i),spec=facilities[i]
        text("BUILD YOUR HOME.",51,233,39,white,"Impact",915)
        button("ALL FACILITIES","clubvisual",rect(1070,239,215,39));button("CLUB PROJECTS","projects",rect(1301,239,243,39))
        text("\(number(c.capacity)) SEATS  /  \(number(c.fans)) SUPPORTERS  /  €\(number(c.cash)) AVAILABLE",54,289,18,accent,"AvenirNext-DemiBold",1460)
        panel(rect(51,330,997,359));clubComplex(rect(62,333,972,315),c,selected:i,projects:f.investments)
        text("CLUB COMPLEX · SCHEMATIC",70,343,13,muted,"AvenirNext-DemiBold",450)
        text(clubProjectCaption(f),70,665,15,white,"AvenirNextCondensed-DemiBold",954)
        for n in facilities.indices {let y:CGFloat=330+CGFloat(n)*42
            button(String(format:"%02d",n+1)+"  "+facilities[n].name.uppercased()+"   \(c.level(n))/\(facilities[n].maxLevel)","clubfocus:\(n)",rect(1070,y,475,36),primary:n==i)
        }
        panel(rect(51,702,997,60));text(spec.name.uppercased(),68,710,23,white,"Impact",331);text(f.facilityEffect(i,level:level),418,719,18,accent,"AvenirNextCondensed-DemiBold",609)
        button(level>=spec.maxLevel ? "VIEW MAX LEVEL":"PREVIEW UPGRADE · €\(number(f.upgradeCost(i)))","facility:\(i)",rect(1070,714,475,48),primary:true)
        clubFinanceButtons(f)
    }
    func clubFinanceButtons(_ f:Franchise){
        button("TICKET −","ticketdown",rect(52,780,184,43));button("€\(f.clubs[f.user].ticket) ↗","tickets",rect(248,780,91,43));button("TICKET +","ticketup",rect(351,780,184,43));button("FINANCE LEDGER","ledger",rect(577,780,306,43));button("TICKET FORECAST","tickets",rect(1091,780,452,43))
    }
    func facilityPreview(_ i:Int,_ f:Franchise){
        let c=f.clubs[f.user],level=c.level(i),spec=facilities[i],next=min(spec.maxLevel,level+1)
        var planned=c;if level<spec.maxLevel{planned.increase(i)}
        text(spec.name.uppercased(),113,111,47,white,"Impact",1320)
        text("PERMANENT CLUB UPGRADE · LEVEL \(level) → \(next)",116,179,20,accent,"AvenirNext-DemiBold",1300)
        for side in 0..<2 {let x:CGFloat=116+CGFloat(side)*695;panel(rect(x,226,667,337))
            text(side==0 ? "YOUR CLUB TODAY":"AFTER THIS UPGRADE",x+18,240,21,side==0 ? muted:accent,"AvenirNextCondensed-Heavy",631)
            clubComplex(rect(x+8,271,650,260),side==0 ? c:planned,selected:i,projects:f.investments,preview:side==1)
            text("LEVEL \(side==0 ? level:next)"+(i==0 ? " · \(number(side==0 ? c.capacity:planned.capacity)) SEATS":""),x+18,532,18,white,"Menlo-Bold",631)
        }
        text(f.facilityEffect(i,level:level),131,583,22,muted,"AvenirNextCondensed-Heavy",642)
        text(f.facilityEffect(i,level:next),826,583,22,accent,"AvenirNextCondensed-Heavy",640)
        paragraph(f.facilityExplanation(i),119,626,1320,64,20,white)
        text("AVAILABLE €\(number(c.cash))"+(level<spec.maxLevel ? " · AFTER PURCHASE €\(number(c.cash-f.upgradeCost(i)))":" · MAXIMUM REACHED"),119,706,18,muted,"AvenirNext-DemiBold",1310)
        button("UPGRADE · €\(number(f.upgradeCost(i)))","upgrade:\(i)",rect(982,752,496,49),primary:true,enabled:level<spec.maxLevel && c.cash>=f.upgradeCost(i))
    }
}
