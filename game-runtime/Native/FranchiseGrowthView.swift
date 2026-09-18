import AppKit
extension FranchiseView {
    func growthModal()->Bool{guard let f=career else{return false}
        if modal=="tradecounter",let offer=f.counterOffer {
            let names:( [String] )->String={ids in ids.compactMap{f.player($0)?.profile.name}.joined(separator:", ")}
            let expired=offer.year != f.year || offer.expires<f.day
            contractDocument(title:"TRANSFER COUNTEROFFER",reference:"TRADE / \(offer.year) / \(offer.issued)",counterparty:db.teams[offer.club].name,
                rows:[("YOUR CLUB SENDS",names(offer.give)),("YOUR CLUB RECEIVES",names(offer.take)),("VALID THROUGH",f.dateLabel(offer.expires)),("TRANSFER TYPE","Permanent exchange · no cash fee")],
                terms:"Their GM proposes this revised package. Review every name before signing. Healthy roster depth, the 1 July deadline and current GM settings are checked again on acceptance. Players move immediately; unaffected lineup positions stay in place.",signed:false)
            button("DECLINE","counterdecline",rect(305,752,250,49));button(expired ? "OFFER EXPIRED":"SIGN & ACCEPT TRADE","counteraccept",rect(972,752,511,49),primary:true,enabled:!expired)
        }else if modal=="tradecounter" {text("NO PENDING COUNTEROFFER",114,140,40,white,"Impact",1300)}
        else if modal=="youthhub" {
            text("THE NEXT GENERATION STARTS HERE.",114,109,39,white,"Impact",1320)
            text("\(f.year) REGIONAL INTAKE · FICTIONAL CAREER PLAYERS · SCOUTING ESTIMATES ARE NOT GUARANTEES",118,178,16,accent,"AvenirNext-DemiBold",1315)
            let candidates=(f.academyIntake?.candidates ?? []).filter{$0.club==f.user}
            for (n,c) in candidates.enumerated(){let x:CGFloat=116+CGFloat(n)*458,p=c.player
                panel(rect(x,239,438,446));text(p.profile.name.uppercased(),x+17,259,29,white,"Impact",404)
                text("\(f.year-(p.profile.birthYear ?? f.year)) YEARS · \(p.positionLabel) · \(p.rating) OVR",x+19,314,20,accent,"AvenirNext-DemiBold",400)
                text(p.youth?.region ?? "Regional academy",x+19,354,18,muted,"AvenirNext-DemiBold",400)
                text("POTENTIAL: "+f.youthEstimate(c)+" OVR",x+19,402,24,white,"Impact",400)
                text(["INITIAL VIEW · LOW CONFIDENCE","SCOUTED · MEDIUM CONFIDENCE","DETAILED REPORT · HIGH CONFIDENCE"][c.scouting],x+19,446,16,accent,"AvenirNext-DemiBold",400)
                paragraph("\(p.isPitcher ? "Pitching":"Position-player") prospect. Repeated training, age and facilities affect progress. The upper estimate is not a promised final rating.",x+19,482,398,68,18,muted)
                button(c.scouting==2 ? "FULLY SCOUTED":"SCOUT · €\(c.scouting==0 ? 800:1500)","youthscout:"+p.profile.id,rect(x+18,573,401,37),enabled:f.champion==nil && !c.signed && c.scouting<2 && f.clubs[f.user].cash>=(c.scouting==0 ? 800:1500))
                button(c.signed ? "SIGNED TO ACADEMY":"REVIEW · €\(number(c.fee))","youthcontract:"+p.profile.id,rect(x+18,629,401,37),primary:true,enabled:!c.signed && f.champion==nil)
            }
            text("FARM \(f.roster(f.user).filter{$0.inFarm}.count)/\(f.farmCapacity) · ROSTER \(f.roster(f.user).count)/32 · €150 PER SIGNED FARM PLAYER / WEEK",119,714,17,muted,"AvenirNext-DemiBold",1305)
        }else if modal.hasPrefix("youthcontract:"),let candidate=f.academyIntake?.candidates.first(where:{$0.player.profile.id==String(modal.dropFirst(14)) && $0.club==f.user}) {
            let p=candidate.player,space=f.roster(f.user).count<32 && f.roster(f.user).filter{$0.inFarm}.count<f.farmCapacity
            contractDocument(title:"ACADEMY DEVELOPMENT AGREEMENT",reference:"YOUTH / \(f.year)",counterparty:p.profile.name,
                rows:[("ROLE",p.positionLabel+" · joins your farm squad"),("SIGNING FEE","€\(number(candidate.fee)) paid now"),("DEVELOPMENT COST","€150 per week while assigned to the farm"),("SCOUTING ESTIMATE",f.youthEstimate(candidate)+" potential OVR · not guaranteed")],terms:"Fictional regional prospect. Training develops individual abilities gradually within this player's potential. You choose their focus and when to promote them. Requires a free farm place and room under the 32-player roster limit. \(space ? "A place is available.":"Your farm or roster is full; free a place before signing.")",signed:candidate.signed)
            button("SIGN & JOIN ACADEMY","youthsign:"+p.profile.id,rect(974,752,509,49),primary:true,enabled:!candidate.signed && space && f.clubs[f.user].cash>=candidate.fee && f.champion==nil)
        }else{return false}
        button("BACK","growthback",rect(113,752,172,49));return true
    }
    func youthAction(_ action:String)->Bool {
        if action=="youthhub"{career?.prepareFranchiseYear();save();modal="youthhub";return true}
        if action.hasPrefix("youthscout:"){if career?.scoutYouth(String(action.dropFirst(11)))==true{save();notify("Scouting report updated. Estimates are now more precise.")};return true}
        if action.hasPrefix("youthcontract:"){modal=action;return true}
        if action.hasPrefix("youthsign:"){if let user=career?.user,career?.signYouth(String(action.dropFirst(10)),for:user)==true{save();modal="youthhub";notify("Academy agreement signed. Choose a focus in Farm.")}else{notify("Check your budget, farm places and roster capacity.")};return true}
        if action=="growthback"{modal=modal.hasPrefix("youthcontract:") ? "youthhub":"";return true}
        return false
    }
}
