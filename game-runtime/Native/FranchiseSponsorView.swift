import AppKit
extension FranchiseView {
    func contractDocument(title:String,reference:String,counterparty:String,rows:[(String,String)],terms:String,signed:Bool){
        let paper=NSColor(hex:"EEEAE1"),printInk=NSColor(hex:"17252B"),softInk=NSColor(hex:"546168")
        fill(rect(111,99,1375,628),paper);fill(rect(111,99,8,628),accent)
        text("HOOFDKLASSE  /  CLUB OFFICE",145,117,15,softInk,"AvenirNext-DemiBold",850)
        text(title,145,147,36,printInk,"Impact",1050)
        text(reference+"  ·  \(career.map{$0.dateLabel($0.day)} ?? "")",147,197,15,softInk,"Menlo",1275)
        fill(rect(147,229,1301,1),softInk.withAlphaComponent(0.3))
        text("BETWEEN",147,248,13,softInk,"AvenirNext-DemiBold",1300)
        text(team.name+"  &  "+counterparty,147,271,27,printInk,"AvenirNextCondensed-Heavy",1280)
        for (i,row) in rows.enumerated(){let y:CGFloat=319+CGFloat(i)*43
            text(row.0,147,y+4,14,softInk,"AvenirNext-DemiBold",289)
            text(row.1,452,y,23,printInk,"AvenirNextCondensed-DemiBold",977)
            fill(rect(147,y+35,1301,1),softInk.withAlphaComponent(0.15))
        }
        paragraph(terms,147,500,1297,82,19,softInk)
        text(signed ? "Club Management":"Your signature",157,592,30,signed ? printInk:softInk,"SnellRoundhand",580)
        fill(rect(147,638,650,1),softInk.withAlphaComponent(0.5))
        text("FOR "+team.name.uppercased(),147,650,13,softInk,"AvenirNext-DemiBold",790)
        text(signed ? "SIGNED / ACTIVE":"AWAITING YOUR SIGNATURE",940,610,23,signed ? NSColor(hex:"276448"):printInk,"Impact",500)
        text(signed ? "Agreement saved in your career.":"Sign & accept below to authorize these terms.",941,649,16,softInk,"AvenirNextCondensed-DemiBold",505)
    }
    func sponsorLogo(_ brand:SponsorBrand,_ r:NSRect){
        if !brand.logo.isEmpty{image("Assets/Sponsors/\(brand.logo).png",r)}
        else{fill(r,white.withAlphaComponent(0.08));text(String(brand.name.prefix(2)).uppercased(),r.minX+8,r.midY-15,25,white,"Impact",r.width-12)}
    }
    func sponsorPlacement(_ slot:Int,_ brand:SponsorBrand,_ r:NSRect){
        let shape=NSBezierPath()
        func pt(_ x:CGFloat,_ y:CGFloat)->NSPoint{NSPoint(x:r.minX+x*r.width,y:r.minY+y*r.height)}
        if [1,2,3].contains(slot){
            for (i,p) in [pt(0.3,0.08),pt(0.12,0.2),pt(0,0.42),pt(0.18,0.53),pt(0.25,0.42),pt(0.25,0.96),pt(0.75,0.96),pt(0.75,0.42),pt(0.82,0.53),pt(1,0.42),pt(0.88,0.2),pt(0.7,0.08),pt(0.6,0.2),pt(0.4,0.2)].enumerated(){if i==0{shape.move(to:p)}else{shape.line(to:p)}};shape.close();accent.withAlphaComponent(0.25).setFill();shape.fill();muted.withAlphaComponent(0.4).setStroke();shape.stroke()
            sponsorLogo(brand,rect(r.minX+r.width*0.30,r.minY+r.height*0.37,r.width*0.40,r.height*0.33))
        }else if slot==0{
            let crown=NSBezierPath(roundedRect:rect(r.minX+r.width*0.2,r.minY+r.height*0.1,r.width*0.65,r.height*0.65),xRadius:r.height*0.28,yRadius:r.height*0.28);accent.withAlphaComponent(0.3).setFill();crown.fill();fill(rect(r.minX,r.minY+r.height*0.70,r.width*0.9,r.height*0.12),accent.withAlphaComponent(0.5));sponsorLogo(brand,rect(r.minX+r.width*0.33,r.minY+r.height*0.23,r.width*0.37,r.height*0.37))
        }else if slot==4{
            fill(rect(r.minX,r.minY+r.height*0.15,r.width,r.height*0.64),accent.withAlphaComponent(0.2));for i in 0..<5{fill(rect(r.minX+CGFloat(i)*r.width*0.18+r.width*0.04,r.minY+r.height*0.21,r.width*0.14,r.height*0.19),muted.withAlphaComponent(0.3))};sponsorLogo(brand,rect(r.minX+r.width*0.32,r.minY+r.height*0.43,r.width*0.36,r.height*0.28))
            for x in [0.18,0.8]{let wheel=NSBezierPath(ovalIn:rect(r.minX+r.width*x-r.height*0.09,r.minY+r.height*0.7,r.height*0.18,r.height*0.18));muted.setFill();wheel.fill()}
        }else{panel(r);sponsorLogo(brand,r.insetBy(dx:r.width*0.16,dy:r.height*0.15))}
    }
    func managerSponsors(){guard let f=career else{return}
        text("BUILD A BIGGER NAME.",51,234,41,white,"Impact",1470)
        text("8 COMMERCIAL SLOTS · \(number(f.clubs[f.user].fans)) FANS · €\(number(f.sponsors.reduce(0){$0+$1.annual}))/YEAR CONTRACTED",54,290,18,accent,"AvenirNext-DemiBold",1460)
        for (i,slot) in sponsorSlots.enumerated(){let x:CGFloat=51+CGFloat(i%4)*378,y:CGFloat=339+CGFloat(i/4)*211;panel(rect(x,y,361,195))
            text(slot.uppercased(),x+15,y+12,23,white,"Impact",331)
            if let c=f.sponsors.first(where:{$0.slot==i}),let b=sponsorBrands.first(where:{$0.id==c.brandID}){
                sponsorPlacement(i,b,rect(x+15,y+54,87,56));text(b.name,x+119,y+58,23,white,"AvenirNextCondensed-Heavy",227)
                text("€\(number(c.annual))/YR · THROUGH \(c.endYear)",x+17,y+119,16,accent,"AvenirNext-DemiBold",328)
                button("CONTRACT DETAILS","sponsorslot:\(i)",rect(x+15,y+150,330,32))
            }else{
                text("AVAILABLE",x+16,y+65,25,muted,"AvenirNextCondensed-Light",328)
                button("OFFERS (\(f.receivedSponsorBrands().count))","sponsorslot:\(i)",rect(x+15,y+143,330,39),primary:true)
            }
        }
        text("Offers arrive gradually as your fanbase grows. One brand per placement. Review offers within four weeks.",54,787,17,muted,"AvenirNext-DemiBold",1460)
    }
    func sponsorModal()->Bool {guard let f=career else{return false}
        if modal=="sponsoroffers"{
            text(sponsorSlots[sponsorSlot].uppercased()+" · SPONSOR OFFERS",113,109,41,white,"Impact",1325)
            if let c=f.sponsors.first(where:{$0.slot==sponsorSlot}),let b=sponsorBrands.first(where:{$0.id==c.brandID}) {
                contractDocument(title:"SPONSORSHIP AGREEMENT",reference:"SP / \(c.startYear) / \(sponsorSlot+1)",counterparty:b.name,
                    rows:[("PLACEMENT",sponsorSlots[sponsorSlot]),("ANNUAL PAYMENT","€\(number(c.annual)) to the club"),("TERM","\(c.startYear)–\(c.endYear) · \(c.years) season(s)")],
                    terms:"This brand exclusively occupies this placement until expiry. Remaining annual payments arrive automatically at season rollover. The brand cannot occupy another club placement. Fictional in-game agreement.",signed:true)
            }else{
                text("RECEIVED OFFERS · \(number(f.clubs[f.user].fans)) FANS · NO MORE THAN ONE NEW APPROACH PER TWO WEEKS",117,179,18,accent,"AvenirNext-DemiBold",1320)
                for (n,b) in f.receivedSponsorBrands().enumerated(){let y:CGFloat=246+CGFloat(n)*110;let o=f.sponsorOffer(b,slot:sponsorSlot),signed=f.sponsors.contains{$0.brandID==b.id}
                    sponsorLogo(b,rect(119,y,62,34));text(b.name,203,y+2,23,white,"AvenirNextCondensed-Heavy",334)
                    text("€\(number(o.annual))/YR · \(o.years)Y",544,y+5,19,accent,"AvenirNext-DemiBold",322)
                    let eligible=f.receivedSponsorBrands().contains{$0.id==b.id} && !signed
                    let days=(f.sponsorMarket?.offers.first{$0.brandID==b.id}?.expires ?? f.day)-f.day
                    text("OFFER EXPIRES IN \(days) DAYS",203,y+40,16,muted,"AvenirNext-DemiBold",700)
                    button(signed ? "SIGNED":"REVIEW","sponsoroffer:"+b.id,rect(1018,y,459,34),primary:eligible,enabled:eligible && f.champion==nil)
                }
                if f.receivedSponsorBrands().isEmpty{paragraph("No sponsor has an open offer right now. Grow your fanbase and continue the calendar. New approaches arrive over time; signing one brand removes it from every other placement.",119,273,1280,170,27,white)}
            }
        }else if modal.hasPrefix("sponsorreview:"),let b=sponsorBrands.first(where:{$0.id==String(modal.dropFirst(14))}){
            let o=f.sponsorOffer(b,slot:sponsorSlot)
            contractDocument(title:"SPONSORSHIP AGREEMENT",reference:"SP / \(f.year) / \(sponsorSlot+1)",counterparty:b.name,
                rows:[("PLACEMENT",sponsorSlots[sponsorSlot]),("ANNUAL PAYMENT","€\(number(o.annual)) to the club"),("TERM","\(f.year)–\(f.year+o.years-1) · \(o.years) season(s)"),("ON SIGNING","+ €\(number(o.firstPayment)) · remaining-season payment")],
                terms:"By signing, you reserve this placement until expiry. This brand cannot fill another placement. Later seasons pay the full annual amount automatically. The first payment is prorated. Fictional in-game agreement.",signed:false)
            fill(rect(1230,109,211,85),ink);sponsorLogo(b,rect(1242,119,185,67))
            button("SIGN & ACCEPT","signsponsor:"+b.id,rect(996,752,481,49),primary:true,enabled:f.receivedSponsorBrands().contains{$0.id==b.id} && !f.sponsors.contains{$0.slot==sponsorSlot})
        }else{return false}
        button("BACK","sponsorback",rect(113,752,172,49));return true
    }
    func sponsorAction(_ action:String)->Bool {
        if action.hasPrefix("sponsorslot:"),let slot=Int(action.dropFirst(12)),sponsorSlots.indices.contains(slot){sponsorSlot=slot;modal="sponsoroffers";return true}
        if action.hasPrefix("sponsoroffer:"){let id=String(action.dropFirst(13));if career?.receivedSponsorBrands().contains(where:{$0.id==id})==true{modal="sponsorreview:"+id};return true}
        if action.hasPrefix("signsponsor:"){if modal=="sponsorreview:"+String(action.dropFirst(12)),career?.signSponsor(String(action.dropFirst(12)),slot:sponsorSlot)==true{save();modal="sponsoroffers";notify("Sponsor signed. First payment received; future annual payments are automatic.")};return true}
        if action=="sponsorback"{modal=modal.hasPrefix("sponsorreview:") ? "sponsoroffers":"";return true}
        return false
    }
}
