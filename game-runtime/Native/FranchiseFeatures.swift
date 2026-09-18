import Foundation

struct ExtraStats:Codable {
    var reliefGames:Int?=nil
    var doubles=0,triples=0,cs=0,sf=0,pitchHR=0,starts=0,wins=0,losses=0,saves=0,pitches=0,pinchPA=0
    mutating func add(_ s:ExtraStats){reliefGames=(reliefGames ?? 0)+(s.reliefGames ?? 0);doubles+=s.doubles;triples+=s.triples;cs+=s.cs;sf+=s.sf;pitchHR+=s.pitchHR;starts+=s.starts;wins+=s.wins;losses+=s.losses;saves+=s.saves;pitches+=s.pitches;pinchPA+=s.pinchPA}
}
extension SeasonStat {
    var x:ExtraStats {get{extra ?? ExtraStats()}set{extra=newValue}}
    var obpValue:Double{ab+bb+x.sf>0 ? Double(h+bb)/Double(ab+bb+x.sf):0}
    var slgValue:Double{ab>0 ? Double(h+x.doubles+2*x.triples+3*hr)/Double(ab):0}
    var opsValue:Double{obpValue+slgValue}
    var whipValue:Double{outs>0 ? Double(allowed+pbb)*3/Double(outs):0}
    func rate(_ n:Double)->String{String(format:"%.3f",n)}
    var obp:String{pa>0 ? rate(obpValue):"—"}
    var slg:String{ab>0 ? rate(slgValue):"—"}
    var ops:String{ab>0 ? rate(opsValue):"—"}
    var whip:String{outs>0 ? String(format:"%.2f",whipValue):"—"}
    var k9:String{outs>0 ? String(format:"%.1f",Double(pk)*27/Double(outs)):"—"}
    var bb9:String{outs>0 ? String(format:"%.1f",Double(pbb)*27/Double(outs)):"—"}
}
struct PlayerInjury:Codable {var name:String,untilDay:Int}
struct FarmProgress:Codable {var weeks=0,games=0,gain=0.0,focus=0}
struct FranchiseOptions:Codable {
    var automaticTraining=true,autoRest=true,autoSubs=true,pauseInjury=true,pausePlayoffs=true,pauseLowFunds=true
    var injuryFrequency=1,trainingPreset=0
    var tradeStrictness:Int?=nil
}
struct ClubObjective {var key:String,title:String,detail:String,progress:Double,reward:Int,done:Bool}
struct Facility {
    var name:String,price:Int,maxLevel:Int,benefit:String
}
let facilities:[Facility]=[
    .init(name:"Stadium",price:28000,maxLevel:12,benefit:"+300 seats · +70 fans per level"),
    .init(name:"Locker room",price:18000,maxLevel:10,benefit:"+2 daily readiness recovery per level"),
    .init(name:"Training academy",price:22000,maxLevel:10,benefit:"+12% individual development per level"),
    .init(name:"Medical centre",price:24000,maxLevel:8,benefit:"Lower injury risk and shorter recovery"),
    .init(name:"Analysis department",price:16000,maxLevel:8,benefit:"+6% discipline, vision and control training"),
    .init(name:"Batting cages",price:20000,maxLevel:8,benefit:"+8% contact and power training"),
    .init(name:"Pitching lab",price:23000,maxLevel:10,benefit:"+8% pitching, break and velocity training"),
    .init(name:"Fan experience",price:15000,maxLevel:8,benefit:"+45 fans · +€1 concessions per attendee"),
    .init(name:"Farm campus",price:26000,maxLevel:10,benefit:"+1 farm slot · +10% farm growth per level")
]
extension FranchiseClub {
    func level(_ kind:Int)->Int {if kind<3{return [stadium,locker,academy][max(0,kind)]};return moreFacilities?.indices.contains(kind-3)==true ? moreFacilities![kind-3]:0}
    mutating func increase(_ kind:Int){if kind==0{stadium+=1}else if kind==1{locker+=1}else if kind==2{academy+=1}else{if moreFacilities==nil{moreFacilities=Array(repeating:0,count:6)};moreFacilities![kind-3]+=1}}
}
extension FranchisePlayer {
    var positionLabel:String {if let p=profile.positions{return p.isEmpty ? profile.position+"?":p.prefix(3).joined(separator:"/")};return profile.position}
    var inFarm:Bool{farm == true}
    func available(_ day:Int)->Bool{!inFarm && (injury?.untilDay ?? -1)<=day}
    var canPitch:Bool{isPitcher || (profile.positions ?? []).contains("P")}
    var canHit:Bool{!isPitcher || (profile.stats?.pa ?? 0)>0 || (profile.positions ?? []).contains(where:{$0 != "P"})}
    var hittingAbilities:[Int]{[0,1,2,9,3,8,4]}
    var pitchingAbilities:[Int]{[5,6,10,11,7,4]}
    var abilities:[Int]{isPitcher ? pitchingAbilities:hittingAbilities}
    var trainableAbilities:[Int]{Array(Set((canPitch ? pitchingAbilities:[])+(canHit ? hittingAbilities:[]))).sorted()}
    func development(_ ability:Int)->Double{growth.indices.contains(ability) ? growth[ability]:0}
    mutating func develop(_ ability:Int,_ amount:Double){if growth.count<abilityNames.count{growth += Array(repeating:0,count:abilityNames.count-growth.count)};growth[ability]+=amount}
    var rating:Int {Int(overallValue.rounded())}
    var evidenceCount:Int{abilities.filter{evidence($0) != nil}.count}
    var ratingLabel:String{youth != nil ? "YTH":(evidenceCount==0 ? "EST": "OVR*")}
    func evidenceText(_ a:Int)->String {
        if youth != nil{return "Fictional academy player · career skill development"}
        guard let s=profile.stats else{return "No matching 2026 data · estimated baseline"}
        switch a {
        case 0:return "2026 H/AB: \(s.hits.map(String.init) ?? "?")/\(s.ab.map(String.init) ?? "?")"
        case 1:return "2026 2B/3B/HR: \(s.doubles.map(String.init) ?? "?")/\(s.triples.map(String.init) ?? "?")/\(s.hr.map(String.init) ?? "?")"
        case 2:return "2026 BB/PA: \(s.bb.map(String.init) ?? "?")/\(s.pa.map(String.init) ?? "?")"
        case 3:return "Speed proxy: SB \(s.sb.map(String.init) ?? "?"), 3B \(s.triples.map(String.init) ?? "?") / playing time"
        case 8:return "Stealing: SB \(s.sb.map(String.init) ?? "?"), CS \(s.cs.map(String.init) ?? "?") · volume + success"
        case 9:return "2026 K/PA: \(s.so.map(String.init) ?? "?")/\(s.pa.map(String.init) ?? "?")"
        case 4:return "2026 fielding: \(s.fieldPO.map(String.init) ?? "?") PO · \(s.fieldA.map(String.init) ?? "?") A · \(s.fieldE.map(String.init) ?? "?") E"
        case 5:return "2026 pitching: \(s.outs.map{String(format:"%.1f",Double($0)/3)} ?? "?") IP, \(s.er.map(String.init) ?? "?") ER, \(s.pitchK.map(String.init) ?? "?") K"
        case 6:return "2026 BB: \(s.pitchBB.map(String.init) ?? "?") / \(s.outs.map{String(format:"%.1f",Double($0)/3)} ?? "?") IP"
        case 7:return "2026 innings per outing · \(s.appearances.map(String.init) ?? "?") appearances"
        case 11:return "Velocity proxy: K/9; no measured velocity available"
        case 10:return "No pitch-movement data · estimated baseline + development"
        default:return "No defensive metrics · estimated baseline + development"
        }
    }
}
extension Franchise {
    var options:FranchiseOptions {get{settings ?? FranchiseOptions()}set{settings=newValue}}
    var farmCapacity:Int{3+clubs[user].level(8)}
    func injured(_ club:Int)->[FranchisePlayer]{roster(club).filter{($0.injury?.untilDay ?? -1)>day}}
    func userBlockers()->[String] {
        var ids=clubs[user].lineup
        if let p=player(starter(user)){ids.append(p.profile.id)}
        var issues=Array(Set(ids)).compactMap{player($0)}.filter{!$0.available(day)}.map{$0.profile.name+" is unavailable. Replace them or use AUTO REPLACE."}
        let arm=starter(user)
        if let slot=clubs[user].lineup.firstIndex(of:arm),clubs[user].defense[slot] != "DH" {
            issues.append("Your starting pitcher is also assigned a fielding position. Move them to DH or the bench, or choose another starter.")
        }
        return issues
    }
    mutating func repairUnavailable(_ club:Int){
        var used=Set(clubs[club].lineup.filter{player($0)?.available(day)==true})
        for slot in clubs[club].lineup.indices where player(clubs[club].lineup[slot])?.available(day) != true {
            let pos=clubs[club].defense[slot]
            let choices=roster(club).filter{!$0.isPitcher && $0.available(day) && !used.contains($0.profile.id)}
            if let p=choices.max(by:{($0.value+($0.fits(pos) ? 15:0))<($1.value+($1.fits(pos) ? 15:0))}){clubs[club].lineup[slot]=p.profile.id;used.insert(p.profile.id)}
        }
        let eligible=roster(club).filter{$0.isPitcher && $0.available(day)}.sorted{$0.value>$1.value}
        for slot in clubs[club].rotation.indices where player(clubs[club].rotation[slot])?.available(day) != true {
            if let p=eligible.first(where:{!clubs[club].rotation.contains($0.profile.id)}){clubs[club].rotation[slot]=p.profile.id}
        }
        if let id=clubs[club].nextStarter,player(id)?.available(day) != true{clubs[club].nextStarter=nil}
    }
    func recommendedTraining()->[FranchisePlayer]{roster(user).filter{!$0.inFarm && ($0.injury?.untilDay ?? -1)<=day}.sorted{
        func score(_ p:FranchisePlayer)->Double{let age=year-(p.profile.birthYear ?? year-28);return Double(max(0,35-age))*2+(80-p.value)*0.6+p.readiness*0.08}
        return score($0)>score($1)
    }}
    mutating func applyPreset(_ preset:Int){
        options.trainingPreset=preset;training=[:]
        if preset==4{return}
        let ps=recommendedTraining().filter{preset==2 ? $0.canPitch:(preset==3 ? $0.canHit:true)}
        for p in ps.prefix(6){let ability:Int
            if preset==1{ability=p.abilities.min(by:{p.skill($0)<p.skill($1)}) ?? 0}
            else{ability=(preset==2 || p.isPitcher) ? (p.skill(6)<p.skill(5) ? 6:5):(p.skill(0)<p.skill(1) ? 0:1)}
            training[p.profile.id]=TrainingOrder(ability:ability,intensity:p.readiness<65 ? 0:1)
        }
    }
    mutating func setFarm(_ id:String,_ send:Bool)->Bool {
        guard let i=players.firstIndex(where:{$0.profile.id==id && $0.club==user}) else{return false}
        if send {
            guard !players[i].inFarm,!clubs[user].lineup.contains(id),!clubs[user].rotation.contains(id),clubs[user].nextStarter != id,roster(user).filter({$0.inFarm}).count<farmCapacity else{return false}
            let active=roster(user).filter{!$0.inFarm && $0.profile.id != id}
            guard active.filter({$0.isPitcher}).count>=3,active.filter({!$0.isPitcher}).count>=9 else{return false}
            players[i].farm=true;players[i].farmProgress=FarmProgress(focus:players[i].isPitcher ? 5:0);training.removeValue(forKey:id)
            log("\(players[i].profile.name) joins the development squad. Weekly farm sessions now apply automatically.")
        }else{guard players[i].inFarm else{return false};players[i].farm=false;log("\(players[i].profile.name) promoted. Assign them a role in Lineup or Pitching.")}
        return true
    }
    mutating func developFarm(){
        for i in players.indices where players[i].club>=0 && players[i].inFarm && (players[i].injury?.untilDay ?? -1)<=day {
            let club=players[i].club,cost=150
            guard clubs[club].cash>=cost else{continue}
            let focus=players[i].farmProgress?.focus ?? (players[i].isPitcher ? 5:0)
            let age=year-(players[i].profile.birthYear ?? year-28)
            let gain=0.14*(age<25 ? 1.25:0.8)*(1+Double(clubs[club].level(8))*0.1+(club==user ? coachBonus(2):0))*players[i].learningFactor(focus)
            let actual=min(0.35,gain,max(0,players[i].abilityCeiling(focus)-players[i].skill(focus)))
            players[i].develop(focus,actual)
            var progress=players[i].farmProgress ?? FarmProgress(focus:focus);progress.weeks+=1;progress.games+=3;progress.gain+=actual;players[i].farmProgress=progress
            clubs[club].cash-=cost;clubs[club].expenses+=cost
            if club==user{trainingReport.append(String(format:"FARM %@ · %@ +%.2f · 3 development games",players[i].profile.name,abilityNames[focus],actual))}
        }
    }
    mutating func checkInjuries(_ ids:Set<String>){
        guard options.injuryFrequency>0 else{return}
        for id in ids.sorted(){guard let i=players.firstIndex(where:{$0.profile.id==id}),players[i].available(day) else{continue}
            let club=players[i].club,medical=clubs[club].level(3)
            let risk=(options.injuryFrequency==1 ? 0.0013:0.0035)*(1+players[i].fatigue/80)/(1+Double(medical)*0.12)
            guard random()<risk else{continue}
            let length=random()<0.9 ? 3+Int(random()*6):12+Int(random()*12)
            let days=max(2,length-medical),names=["Muscle tightness","Ankle sprain","Shoulder soreness"]
            let name=names[Int(random()*Double(names.count))%names.count]
            players[i].injury=PlayerInjury(name:name,untilDay:day+days)
            if club==user{log("INJURY: \(players[i].profile.name) · \(name) · expected back \(dateLabel(day+days)).");if options.pauseInjury{pauseReason="Injury: \(players[i].profile.name). Review Health and your lineup."}}
        }
    }
    func awardScore(_ p:FranchisePlayer,_ category:Int)->Double {
        let s=p.totals
        switch category {
        case 0:return p.isPitcher ? Double(s.outs)*0.19+Double(s.pk)*0.35-Double(s.er)*0.85:Double(s.h+s.bb)*0.65+Double(s.hr)*2+Double(s.r+s.rbi)*0.25+Double(s.sb)*0.4
        case 1:return Double(s.outs)*0.3+Double(s.pk)*0.6-Double(s.er)*1.5-Double(s.pbb)*0.25
        case 2:return Double(s.hr)
        case 3:return Double(s.sb)
        default:return s.ab>0 ? Double(s.h)/Double(s.ab):0
        }
    }
    func awardLeaders(_ category:Int)->[FranchisePlayer]{
        let games=table().map{$0.w+$0.l}.max() ?? 0
        return players.filter{p in
            if category==1{return p.totals.outs>=max(3,games)}
            if category==4{return p.totals.pa>=max(1,Int(ceil(Double(games)*3.1)))}
            return category==0 ? p.totals.pa>0 || p.totals.outs>0:(!p.isPitcher && p.totals.pa>0)
        }.sorted{a,b in let av=awardScore(a,category),bv=awardScore(b,category);return av==bv ? a.profile.id<b.profile.id:av>bv}.prefix(3).map{$0}
    }
    var objectives:[ClubObjective]{boardObjectives}
    mutating func settleObjectives(){for o in objectives where o.done && !(claimedObjectives ?? []).contains(o.key){if claimedObjectives==nil{claimedObjectives=[]};claimedObjectives!.append(o.key);clubs[user].cash+=o.reward;clubs[user].income+=o.reward;log("OBJECTIVE: \(o.title) completed. Board reward +€\(o.reward).")}}
    mutating func archiveAwards(){guard champion != nil,awardsYear != year else{return};awardsYear=year
        let names=["MVP","Beste Werper","Home Run Leader","Stolen Base Leader","Batting Title"]
        for i in 0..<5{if let p=awardLeaders(i).first{let result="\(year) · \(names[i]): \(p.profile.name)";if awardHistory==nil{awardHistory=[]};awardHistory!.insert(result,at:0);log("AWARD: "+result)}}
    }
    func recentForm(_ club:Int)->String{let g=schedule.filter{$0.played && ($0.home==club || $0.away==club)}.suffix(5);return g.isEmpty ? "No games yet":g.map{$0.winner==club ? "W":"L"}.joined(separator:"  ")}
}

extension Franchise {
    mutating func refreshProfiles(_ db:Database){
        let profiles=Dictionary(uniqueKeysWithValues:db.players.map{($0.id,$0)})
        for i in players.indices{if let profile=profiles[players[i].profile.id]{players[i].profile=profile}}
        migrateSponsors();prepareFranchiseYear();recordDevelopment()
    }
}

// Display values reflect the same facility formulas used by training, recovery and match income.
extension Franchise {
    func facilityEffect(_ kind:Int,level:Int)->String {
        switch kind {
        case 0:return "\(1000+level*300) seats · +\(level*70) supporters from upgrades"
        case 1:return "Daily recovery: hitters \(12+level*2) / pitchers \(9+level*2)"
        case 2:return "+\(level*12)% individual training growth"
        case 3:
            let reduction=Int((1.0-1.0/(1.0+Double(level)*0.12))*100.0)
            return "Injury risk −\(reduction)% · recovery up to \(level)d faster"
        case 4:return "+\(level*6)% discipline / vision / control training"
        case 5:return "+\(level*8)% contact / power training"
        case 6:return "+\(level*8)% pitching / break / velocity training"
        case 7:return "€\(3+level) concessions / fan · +\(level*45) supporters from upgrades"
        default:return "\(3+level) farm slots · +\(level*10)% farm growth"
        }
    }
    func facilityExplanation(_ kind:Int)->String {
        switch kind {
        case 0:return "Extra seats increase the attendance ceiling; they earn money only when demand fills them. Each level also attracts 70 supporters immediately. Home-game operating cost rises by €200 per level. Check attendance and gate income in your game reports."
        case 1:return "Recovery applies as the calendar advances, up to 100% readiness. Each level restores two extra readiness points per day. It does not remove injuries or provide extra rest between games on the same day."
        case 2:return "This bonus applies to each paid individual weekly session. Specialist facility bonuses add to it. Age, fatigue and intensity still affect the actual gain; abilities cap at 95. See the weekly training report for the resulting gains."
        case 3:return "Medical care lowers the chance of new injuries and shortens newly generated recovery periods, with a minimum of two days. Existing recovery dates are unchanged. It has no effect while new injuries are switched off."
        case 4,5,6:return "The bonus applies only to the listed abilities during individual weekly training and adds to the academy bonus. It does not instantly raise a player's rating. Assign a matching training plan and check the weekly report."
        case 7:return "Each level immediately adds 45 supporters and €1 in concession income per attendee at every future home game. Attendance still depends on demand, ticket prices and capacity. See the finance ledger for home-game income."
        default:return "Each level opens one extra development place and increases farm growth by 10% of the base rate. Assign a reserve to the farm to use it. Each farm player costs €150 per week; academy bonuses apply to first-team individual training separately."
        }
    }
}
