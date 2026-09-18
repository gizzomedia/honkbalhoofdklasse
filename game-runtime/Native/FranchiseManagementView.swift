import AppKit

extension FranchiseView {
    var positionDropdownRect:NSRect {
        guard let f=career,f.clubs[f.user].lineup.indices.contains(lineupSlot),let p=f.player(f.clubs[f.user].lineup[lineupSlot])else{return rect(607,350,550,200)}
        return rect(607,350,550,CGFloat(78+39*defensePositions.filter{p.fits($0)}.count))
    }
    func positionDropdown(){guard let f=career else{return}
        let r=positionDropdownRect;areas.removeAll{$0.rect.intersects(r)};fill(r,ink);fill(rect(607,350,550,3),accent)
        text("ELIGIBLE POSITIONS · SWAPS FIELD ASSIGNMENTS",620,363,16,accent,"AvenirNext-DemiBold",519)
        let p=f.player(f.clubs[f.user].lineup[lineupSlot])!
        if !p.fits(f.clubs[f.user].defense[lineupSlot]){text("CURRENT: \(f.clubs[f.user].defense[lineupSlot]) · OUT OF POSITION",620,382,14,NSColor(hex:"E8A09E"),"AvenirNext-DemiBold",519)}
        for (i,pos) in defensePositions.filter({p.fits($0)}).enumerated(){let y:CGFloat=414+CGFloat(i)*39,other=f.clubs[f.user].defense.firstIndex(of:pos)!,name=f.player(f.clubs[f.user].lineup[other])!.profile.name
            button(pos+(p.fits(pos) ? "":" · OUT OF POSITION"),"setfield:"+pos,rect(620,y,240,33),primary:pos==f.clubs[f.user].defense[lineupSlot])
            text(name,875,y+5,16,muted,"AvenirNextCondensed-DemiBold",267)
        }
    }
    func managerStaff(){guard let f=career else{return}
        text("BUILD YOUR COACHING STAFF.",51,234,40,white,"Impact",1470)
        text("FICTIONAL STAFF · €\(f.staffWeeklyCost)/WEEK · HIRING AUTOMATION \(f.automation.staff ? "ON":"OFF")",54,290,18,accent,"AvenirNext-DemiBold",1470)
        for role in coachRoles.indices{button(coachRoles[role].uppercased(),"staffrole:\(role)",rect(51+CGFloat(role)*378,333,362,42),primary:staffRole==role)}
        let hired=f.staff.first{$0.role==staffRole}
        panel(rect(51,398,1492,99));text(hired.map{"\($0.name) · \($0.quality)/5 · €\($0.salary)/WEEK"} ?? "NO COACH HIRED",71,411,29,white,"AvenirNextCondensed-Heavy",1150)
        text(staffBenefit(staffRole,hired?.quality ?? 0),73,456,19,accent,"AvenirNext-DemiBold",1170)
        if hired != nil{button("RELEASE","firecoach:\(staffRole)",rect(1310,425,207,45))}
        for (i,c) in f.coachingCandidates(staffRole).enumerated(){let x:CGFloat=51+CGFloat(i)*507;panel(rect(x,520,485,238));text(c.name,x+19,538,30,white,"AvenirNextCondensed-Heavy",443)
            text("QUALITY \(c.quality)/5 · €\(c.salary)/WEEK",x+21,585,19,accent,"AvenirNext-DemiBold",440)
            text(staffBenefit(c.role,c.quality),x+21,623,19,white,"AvenirNextCondensed-DemiBold",439)
            text("SIGNING FEE €\(number(c.signingFee))",x+21,657,17,muted,"AvenirNext-DemiBold",439)
            button(hired?.id==c.id ? "HIRED":"REVIEW CONTRACT","hirecoach:\(i)",rect(x+20,701,443,40),primary:true,enabled:hired?.id != c.id && f.clubs[f.user].cash>=c.signingFee+c.salary)
        }
        text("Weekly salary is charged at training settlement. Replacing a coach ends the old salary; bonuses do not stack.",54,795,18,muted,"AvenirNext-DemiBold",1460)
    }
    func staffBenefit(_ role:Int,_ quality:Int)->String {
        role==3 ? String(format:"+%.1f daily readiness recovery",Double(quality)*0.5):"+\(quality*5)% \(role==0 ? "hitting training":role==1 ? "pitching training":"farm development")"
    }
    func managerSettings(){guard let f=career else{return}
        text("YOUR CLUB. YOUR LEVEL OF CONTROL.",51,234,39,white,"Impact",1470)
        text("AUTOMATION IS OPTIONAL · MANUAL CONTROL IS THE DEFAULT",54,289,18,accent,"AvenirNext-DemiBold",1440)
        let a=f.automation
        let rows:[(String,String,Bool,String)]=[
            ("plan","Choose training assignments",a.trainingPlan,"Refresh your chosen preset every week; replaces individual plans."),
            ("sessions","Run weekly training",f.options.automaticTraining,"Apply saved assignments automatically when a week is reached."),
            ("staff","Hire staff",a.staff,"Fill vacancies weekly within the payroll cap and cash reserve."),
            ("lineup","Pick the batting lineup",a.lineup,"Before your games; may replace your manual batting order."),
            ("rotation","Manage starting rotation",a.rotation,"Before your games; clears manual next-starter overrides."),
            ("tickets","Set ticket prices",a.tickets,"Weekly; balance matchday income and fan growth."),
            ("facilities","Buy facility upgrades",a.facilities,"At most one per week, retaining reserve and eight weeks of staff pay.")]
        for (i,row) in rows.enumerated(){let y:CGFloat=331+CGFloat(i)*57;panel(rect(51,y,1493,51));text(row.1,68,y+7,22,white,"AvenirNextCondensed-Heavy",420);text(row.3,489,y+12,17,muted,"AvenirNextCondensed-DemiBold",827);button(row.2 ? "AUTO":"MANUAL","automate:"+row.0,rect(1341,y+7,181,37),primary:row.2)}
        button("STAFF CAP €\(a.weeklyStaffBudget)/WEEK","staffbudget",rect(51,739,490,43));button("CASH RESERVE €\(a.reserve)","autoreserve",rect(558,739,490,43));button("INJURIES & SIM STOPS","tab:12",rect(1065,739,479,43))
        button("REPLAY FRANCHISE TOUR","tour:start",rect(51,796,490,36));button("TOUR ON NEW CAREERS: \(interfacePreferences.showCareerTour ? "ON":"OFF")","tour:toggle",rect(558,796,490,36));button("TRADE GM: "+["RELAXED","BALANCED","STRICT"][f.gmStrictness],"tradestrict",rect(1065,796,479,36))
    }
    func managementModal()->Bool{guard let f=career else{return false}
        if modal=="teamanalysis" {
            let a=f.teamAnalysis()
            text("UNDERSTAND YOUR RESULTS.",113,108,41,white,"Impact",1320)
            text("LAST \(a.games): \(a.wins) W / \(a.games-a.wins) L · RUNS \(a.runsFor)–\(a.runsAgainst) · PREVIOUS \(a.previousGames): \(a.previousWins) W / \(a.previousGames-a.previousWins) L",117,167,18,accent,"AvenirNext-DemiBold",1320)
            text("\(a.games<10 ? "EARLY SIGNAL / SMALL SAMPLE":"PATTERNS, NOT PROVEN CAUSES") · \(a.boxGames)/\(a.games) TEAM BOX SCORES · LEAGUE = SAME DATE WINDOW",117,199,15,muted,"AvenirNext-DemiBold",1320)
            for (i,c) in a.cards.enumerated(){let x:CGFloat=115+CGFloat(i%2)*683,y:CGFloat=238+CGFloat(i/2)*248
                panel(rect(x,y,653,231));fill(rect(x,y,3,231),c.concern ? NSColor(hex:"CCA56C"):green.withAlphaComponent(0.6))
                text(c.title,x+18,y+13,25,white,"Impact",610)
                paragraph(c.evidence,x+20,y+51,610,53,19,accent)
                paragraph(c.advice,x+20,y+108,611,77,18,muted)
                button("REVIEW OPTIONS","analysisreview:"+c.action,rect(x+18,y+191,616,29))
            }
            button("STAFF REPORT","staffreport",rect(1190,752,287,49))
        }else if modal.hasPrefix("staffcontract:"),let coach=coachRoles.indices.flatMap({f.coachingCandidates($0)}).first(where:{$0.id==String(modal.dropFirst(14))}){
            let replaced=f.staff.first{$0.role==coach.role}
            contractDocument(title:"COACHING AGREEMENT",reference:"STAFF / \(f.year) / \(coach.role+1)",counterparty:coach.name,
                rows:[("APPOINTMENT",coachRoles[coach.role]+" · quality \(coach.quality)/5"),("SIGNING FEE","€\(number(coach.signingFee)) paid now · non-refundable"),("WEEKLY SALARY","€\(number(coach.salary)) · paid at weekly training"),("CASH AFTER SIGNING","€\(number(f.clubs[f.user].cash-coach.signingFee))")],
                terms:"Effect: \(staffBenefit(coach.role,coach.quality)). Open-ended appointment; release ends future pay. \(replaced.map{"Replaces \($0.name); previous signing fees are not refunded."} ?? "No current coach will be replaced.") Salary starts at the next weekly settlement. Fictional staff.",signed:false)
            button("SIGN & ACCEPT","signcoach:"+coach.id,rect(996,752,481,49),primary:true,enabled:!f.staff.contains(coach) && f.clubs[f.user].cash>=coach.signingFee+coach.salary)
        }else if modal=="bullpenreport" {
            text("EVERY ARM HAS A ROLE.",113,109,44,white,"Impact",1320)
            text("SIMULATED SEASON · RG = RELIEF APPEARANCES · ROTATION / BULLPEN",116,182,18,accent,"AvenirNext-DemiBold",1320)
            for (i,p) in f.roster(f.user).filter({$0.canPitch}).sorted(by:{$0.totals.outs>$1.totals.outs}).prefix(16).enumerated(){let y:CGFloat=242+CGFloat(i)*28
                text(p.profile.name,118,y,21,white,"AvenirNextCondensed-Heavy",410)
                text(f.clubs[f.user].rotation.contains(p.profile.id) ? "ROTATION":"BULLPEN",540,y+2,15,muted,"AvenirNext-DemiBold",187)
                text("\(p.totals.ip) IP · \(p.totals.x.starts) GS · \(p.totals.x.reliefGames ?? 0) RG · \(p.totals.era) ERA · \(Int(p.readiness))% READY",728,y+2,17,accent,"AvenirNextCondensed-DemiBold",750)
            }
        }else if modal=="tickets"{
            text("PRICE THE NEXT HOME GAME.",113,109,44,white,"Impact",1340)
            text("MODEL FORECAST · REGULAR SEASON · CURRENT FANS & CAPACITY",116,184,18,accent,"AvenirNext-DemiBold",1340)
            for (i,title) in ["TICKET","LIKELY CROWD","FAN RESPONSE"].enumerated(){text(title,118+CGFloat(i)*445,258,18,muted,"AvenirNext-DemiBold",260)}
            let price=f.clubs[f.user].ticket
            for (i,v) in Array(max(8,price-2)...min(22,price+2)).enumerated(){let y:CGFloat=307+CGFloat(i)*48,forecast=f.ticketForecast(price:v);if v==price{fill(rect(114,y-4,1361,44),accent.withAlphaComponent(0.19))};let low=min(f.clubs[f.user].capacity,Int(Double(forecast.fans)*0.85)),high=min(f.clubs[f.user].capacity,Int(Double(forecast.fans)*1.15));let cols=["€\(v)","\(low)–\(high)",v<=13 ? "ACCESSIBLE":v<=16 ? "BALANCED":"PREMIUM / GROWTH RISK"]
                for (j,t) in cols.enumerated(){text(t,118+CGFloat(j)*445,y,25,v==price ? accent:white,"AvenirNextCondensed-Heavy",420)}
            }
            paragraph("Higher prices raise income per visitor but reduce demand and can slow fan growth. Affordable prices help attract supporters. Crowd ranges are estimates; results depend on capacity and matchday demand. Actual receipts appear in the finance ledger after games.",119,577,1320,114,22,muted)
            button("− €1","ticketdown",rect(777,752,196,49),enabled:price>8);button("€\(price) CURRENT","tickets",rect(989,752,247,49));button("+ €1","ticketup",rect(1251,752,226,49),enabled:price<22)
        }else if modal=="staffreport" {
            text("THE STAFF REPORT.",113,110,48,white,"Impact",1310)
            text("CURRENT ADVICE · REVIEW BEFORE APPLYING · NO AUTOMATIC CHANGES",117,183,18,accent,"AvenirNext-DemiBold",1330)
            for (i,a) in f.staffAdvice().enumerated(){let y:CGFloat=244+CGFloat(i)*149;panel(rect(116,y,1365,133));text(a.title,137,y+13,28,white,"AvenirNextCondensed-Heavy",1040);paragraph(a.detail,139,y+57,1034,61,19,muted);button("REVIEW",a.action,rect(1216,y+45,239,47))}
        }else if modal.hasPrefix("progress:"),let p=f.player(String(modal.dropFirst(9))) {
            text(p.profile.name.uppercased(),113,109,42,white,"Impact",1150)
            let points=p.developmentHistory ?? [],first=points.first
            text(String(format:"OVR %d · MODEL %.2f · RECORDED CHANGE %+.2f",p.rating,p.overallValue,p.overallValue-(first?.overall ?? p.overallValue)),116,180,23,accent,"AvenirNextCondensed-Heavy",1330)
            panel(rect(116,239,1360,241))
            if points.count<2{paragraph("Your history starts now. Complete weekly training to see how your abilities and overall develop.",147,314,1260,98,25,white)}
            else {
                let low=(points.map{$0.overall}.min() ?? 60)-0.3,high=(points.map{$0.overall}.max() ?? 70)+0.3
                let path=NSBezierPath();path.lineWidth=3
                for (i,p) in points.enumerated(){let q=NSPoint(x:157+CGFloat(i)*1270/CGFloat(points.count-1),y:442-CGFloat((p.overall-low)/(high-low))*167);if i==0{path.move(to:q)}else{path.line(to:q)}}
                accent.setStroke();path.stroke();text(String(format:"%.2f",high),125,250,15,muted,"Menlo",110);text(String(format:"%.2f",low),125,443,15,muted,"Menlo",110)
            }
            for (i,a) in p.trainableAbilities.enumerated(){let x:CGFloat=118+CGFloat(i%3)*457,y:CGFloat=502+CGFloat(i/3)*48,base=first?.skills.indices.contains(a)==true ? first!.skills[a]:p.skill(a)
                text(abilityNames[a],x,y,20,white,"AvenirNextCondensed-Heavy",263);text(String(format:"%.1f (%+.1f)",p.skill(a),p.skill(a)-base),x+235,y,19,accent,"Menlo",205)
            }
            text("OVR rounds to a whole number. Training and season-end aging change abilities; small gains accumulate before OVR rounds up.",118,716,16,muted,"AvenirNext-DemiBold",1330)
        }else{return false}
        button("BACK","close",rect(113,752,172,49));return true
    }
    func managementAction(_ action:String)->Bool {
        if action=="teamanalysis"{modal=action;focus=0;return true}
        if action.hasPrefix("analysisreview:"){modal="";act(String(action.dropFirst(15)));return true}
        if action.hasPrefix("setfield:"),var f=career{_=f.setFieldPosition(slot:lineupSlot,position:String(action.dropFirst(9)));career=f;positionMenu=false;save();notify(f.lineupWarnings(f.user).first ?? "Defensive assignments updated.");return true}
        if action.hasPrefix("staffrole:"){staffRole=Int(action.dropFirst(10)) ?? 0;return true}
        if action.hasPrefix("hirecoach:"),let tier=Int(action.dropFirst(10)),let f=career,(0..<3).contains(tier){modal="staffcontract:"+f.coachingCandidates(staffRole)[tier].id;focus=0;return true}
        if action.hasPrefix("signcoach:"),modal=="staffcontract:"+String(action.dropFirst(10)),var f=career,let coach=coachRoles.indices.flatMap({f.coachingCandidates($0)}).first(where:{$0.id==String(action.dropFirst(10))}){if f.hireCoach(coach){career=f;save();modal="";notify("Signed: \(coach.name) · €\(number(coach.signingFee)) paid · €\(coach.salary)/week.")}else{notify("Contract not signed. Check club funds and current staff.")};return true}
        if action.hasPrefix("firecoach:"),let role=Int(action.dropFirst(10)){career?.fireCoach(role);save();return true}
        if action.hasPrefix("progress:"){career?.recordDevelopment();modal=action;focus=0;return true}
        if action.hasPrefix("automate:"),var f=career{
            switch String(action.dropFirst(9)){
            case "plan":f.automation.trainingPlan.toggle()
            case "sessions":f.options.automaticTraining.toggle()
            case "staff":f.automation.staff.toggle()
            case "lineup":f.automation.lineup.toggle()
            case "rotation":f.automation.rotation.toggle()
            case "tickets":f.automation.tickets.toggle()
            case "facilities":f.automation.facilities.toggle()
            default:break
            };career=f;save();return true
        }
        switch action{
        case "tickets","staffreport","bullpenreport":modal=action;focus=0;return true
        case "staffbudget":if var f=career{let choices=[800,1400,2400,3200];f.automation.weeklyStaffBudget=choices[((choices.firstIndex(of:f.automation.weeklyStaffBudget) ?? 0)+1)%choices.count];career=f;save()};return true
        case "autoreserve":if var f=career{let choices=[15000,30000,60000,100000];f.automation.reserve=choices[((choices.firstIndex(of:f.automation.reserve) ?? 0)+1)%choices.count];career=f;save()};return true
        default:return false
        }
    }
}
