import Foundation

struct YouthOrigin:Codable {var year:Int,skills:[Double],ceilings:[Double],region:String}
struct YouthCandidate:Codable {var player:FranchisePlayer,club:Int,scouting:Int=0,fee:Int,signed:Bool=false}
struct YouthIntake:Codable {var year:Int,candidates:[YouthCandidate]}
struct BoardPlan:Codable {var year:Int,style:Int,fanTarget:Int,growthTarget:Double,cashTarget:Int
    var title:String{["Develop the club","Challenge the top four","Compete for the title"][style]}
}
struct BoardReview:Codable {var year:Int,met:Int,confidence:Int,summary:String}
extension FranchisePlayer {
    func abilityCeiling(_ a:Int)->Double{youth?.ceilings.indices.contains(a)==true ? youth!.ceilings[a]:95}
    var youthPotential:Int {
        guard let y=youth else{return rating}
        var peak=self;peak.growth=y.ceilings.enumerated().map{max(0,$0.element-y.skills[$0.offset])}
        return peak.rating
    }
}
extension Franchise {
    var currentBoardPlan:BoardPlan{boardPlan?.year==year ? boardPlan!:makeBoardPlan()}
    func makeBoardPlan()->BoardPlan {
        var style=[1,5].contains(user) ? 2:([4,6].contains(user) ? 0:1)
        if let previous=history.last,previous.userWins+previous.userLosses>0 {
            let pct=Double(previous.userWins)/Double(previous.userWins+previous.userLosses)
            if previous.champion==user || pct>=0.65{style=2}else if pct<0.35{style=0}else{style=1}
        }
        return BoardPlan(year:year,style:style,fanTarget:[150,250,400][style],growthTarget:[12,8,6][style],cashTarget:[125000,180000,220000][style])
    }
    var boardObjectives:[ClubObjective] {
        let plan=currentBoardPlan,developed=roster(user).reduce(0){$0+$1.growth.reduce(0,+)}-(seasonGrowthBaseline ?? 0)
        let fanGain=clubs[user].fans-(seasonFanBaseline ?? 1150),record=table().first{$0.club==user}!
        let sportDone=plan.style==2 ? champion==user:plan.style==1 ? seeds.prefix(4).contains(user):record.w>=12
        let sportProgress=plan.style==2 ? (champion==user ? 1.0:seriesWinner(1000,3)==user || seriesWinner(1001,3)==user ? 0.75:seeds.prefix(4).contains(user) ? 0.5:Double(record.w)/60):plan.style==1 ? (seeds.prefix(4).contains(user) ? 1:Double(record.w)/24):Double(record.w)/12
        let entries:[(String,String,String,Double,Int,Bool)]=[
            ("development","Develop your squad","Earn \(Int(plan.growthTarget)) ability points through development",developed/plan.growthTarget,6000,developed>=plan.growthTarget),
            ("fans","Grow the fanbase","Add \(plan.fanTarget) supporters this season",Double(fanGain)/Double(plan.fanTarget),5000,fanGain>=plan.fanTarget),
            ("playoffs",plan.style==2 ? "Win the Holland Series":plan.style==1 ? "Reach the semifinals":"Build a competitive season",plan.style==2 ? "Finish the postseason as champions":plan.style==1 ? "Finish the regular season in the top four":"Win at least 12 regular-season games",sportProgress,[12000,18000,25000][plan.style],sportDone),
            ("budget","Keep the club sustainable","Finish with at least €\(plan.cashTarget) in cash",Double(clubs[user].cash)/Double(plan.cashTarget),8000,champion != nil && clubs[user].cash>=plan.cashTarget)]
        return entries.map{ClubObjective(key:$0.0,title:$0.1,detail:$0.2,progress:max(0,min(1,$0.3)),reward:$0.4,done:$0.5 || (claimedObjectives ?? []).contains($0.0))}
    }
    mutating func reviewBoardSeason(){
        guard champion != nil,!(boardReviews ?? []).contains(where:{$0.year==year}) else{return}
        let met=boardObjectives.filter{$0.done}.count,newConfidence=max(10,min(100,(boardConfidence ?? 60)+(met-2)*8))
        boardConfidence=newConfidence
        let summary="\(year): \(met)/4 objectives met. Board confidence \(newConfidence)%."
        boardReviews=Array(((boardReviews ?? [])+[BoardReview(year:year,met:met,confidence:newConfidence,summary:summary)]).suffix(20))
        // Confidence has a modest, explicit consequence, settled once at rollover.
        let grant=met>=3 ? 10000:0
        if grant>0{clubs[user].cash+=grant;clubs[user].income+=grant}
        log("BOARD REVIEW: "+summary+(grant>0 ? " €10,000 extra development grant.":" No extra development grant."))
    }
    mutating func prepareFranchiseYear(){
        guard !draft else{return}
        if boardPlan?.year != year{boardPlan=makeBoardPlan()}
        guard academyIntake?.year != year else{return}
        let first=["Milan","Dario","Jesse","Rafael","Noah","Jairo","Timo","Diego","Finn","Elian","Sem","Nico"]
        let last=["Vermeer","Martina","Smit","Maduro","Bakker","De Vries","Jansen","Rosalia","Vos","Jacobs","Meijer","De Jong"]
        let regions=["West-Brabant","Rotterdam","Gooi","Kennemerland","Haarlemmermeer","Amsterdam","Utrecht"]
        var candidates=[YouthCandidate]()
        for c in clubs.indices {for n in 0..<3 {
            let key=(year*7+c*3+n)%144,name=first[key%12]+" "+last[key/12]
            let position=n==0 ? "P":defensePositions[(year+c*2+n)%8]
            let profile=Player(id:"academy-\(year)-\(c)-\(n)",teamID:"academy-\(c)",name:name,position:position,number:nil,bats:random()<0.3 ? "L":"R",throws:"R",sourceID:nil,birthYear:year-17-Int(random()*3),ovr:nil,stats:nil,positions:position=="P" ? ["P"]:[position,"DH"],positionCoverage:"Fictional academy player")
            var skills=(0..<12).map{_ in 40+random()*10}
            for a in position=="P" ? [5,6,7]:[0,2,4]{skills[a]+=4}
            let rare=random()<0.08 ? 7.0:0.0,ceilings=skills.map{min(89,$0+12+random()*9+rare)}
            var player=FranchisePlayer(profile:profile,club:c);player.youth=YouthOrigin(year:year,skills:skills,ceilings:ceilings,region:regions[c]);player.farm=true;player.farmProgress=FarmProgress(focus:position=="P" ? 5:0)
            candidates.append(YouthCandidate(player:player,club:c,fee:5000+n*2000))
        }}
        academyIntake=YouthIntake(year:year,candidates:candidates)
        log("YOUTH INTAKE: three new regional prospects are available in Development → Farm → Youth Scouting. These are fictional career players.")
    }
    func youthEstimate(_ candidate:YouthCandidate)->String {
        let trueValue=candidate.player.youthPotential,level=candidate.scouting
        let bias=level==2 ? 0:((candidate.fee/1000+candidate.club+year)%9-4)
        let uncertainty=[13,7,3][max(0,min(2,level))]
        return "\(max(candidate.player.rating,trueValue+bias-uncertainty))–\(min(99,trueValue+bias+uncertainty))"
    }
    @discardableResult mutating func scoutYouth(_ id:String)->Bool {
        guard !draft,champion==nil,academyIntake?.year==year,let i=academyIntake?.candidates.firstIndex(where:{$0.player.profile.id==id && $0.club==user && !$0.signed}),academyIntake!.candidates[i].scouting<2 else{return false}
        let cost=academyIntake!.candidates[i].scouting==0 ? 800:1500
        guard clubs[user].cash>=cost else{return false}
        clubs[user].cash-=cost;clubs[user].expenses+=cost;academyIntake!.candidates[i].scouting+=1
        ledger.insert("\(dateLabel(day)): youth scouting −€\(cost)",at:0);return true
    }
    @discardableResult mutating func signYouth(_ id:String,for owner:Int)->Bool {
        guard clubs.indices.contains(owner),!draft,champion==nil,academyIntake?.year==year,let i=academyIntake?.candidates.firstIndex(where:{$0.player.profile.id==id && $0.club==owner && !$0.signed}),player(id)==nil else{return false}
        let candidate=academyIntake!.candidates[i]
        guard roster(owner).count<32,roster(owner).filter({$0.inFarm}).count<3+clubs[owner].level(8),clubs[owner].cash>=candidate.fee else{return false}
        players.append(candidate.player);clubs[owner].roster.append(id);academyIntake!.candidates[i].signed=true
        clubs[owner].cash-=candidate.fee;clubs[owner].expenses+=candidate.fee
        if owner==user{ledger.insert("\(dateLabel(day)): academy signing \(candidate.player.profile.name) −€\(candidate.fee)",at:0);log("ACADEMY SIGNING: \(candidate.player.profile.name) joins the farm. Choose a development focus; promotion is your decision.")}
        recordDevelopment();return true
    }
    mutating func recruitCPUYouth(){
        prepareFranchiseYear()
        for i in players.indices where players[i].club != user && players[i].club>=0 && players[i].youth != nil && players[i].inFarm && (players[i].injury?.untilDay ?? -1)<=day {
            let age=year-(players[i].profile.birthYear ?? year)
            if age>=21 || players[i].rating>=68 {players[i].farm=false}
        }
        for c in clubs.indices where c != user {
            let own=(academyIntake?.candidates ?? []).filter{$0.club==c}
            guard !own.contains(where:{$0.signed}),let prospect=own.max(by:{$0.player.youthPotential<$1.player.youthPotential}),clubs[c].cash-prospect.fee>=30000 else{continue}
            _=signYouth(prospect.player.profile.id,for:c)
        }
    }
}

extension Franchise {
    func growthStateValid()->Bool {
        func validYouth(_ p:FranchisePlayer)->Bool {
            guard let y=p.youth else{return true}
            return y.skills.count==12 && y.ceilings.count==12 && zip(y.skills,y.ceilings).allSatisfy{$0.isFinite && $1.isFinite && $0>=15 && $1>=15 && $0<=$1 && $1<=95}
        }
        guard players.allSatisfy(validYouth) else{return false}
        if let plan=boardPlan,(!(0...2).contains(plan.style) || plan.fanTarget<=0 || plan.growthTarget<=0 || !plan.growthTarget.isFinite || plan.cashTarget<=0){return false}
        if let intake=academyIntake {
            guard intake.candidates.count<=21,Set(intake.candidates.map{$0.player.profile.id}).count==intake.candidates.count,intake.candidates.allSatisfy({clubs.indices.contains($0.club) && (0...2).contains($0.scouting) && (0...20000).contains($0.fee) && validYouth($0.player) && $0.player.youth != nil}) else{return false}
        }
        if let offer=counterOffer {
            guard clubs.indices.contains(offer.club),offer.club != user,(1...3).contains(offer.give.count),(1...3).contains(offer.take.count),offer.expires>=offer.issued else{return false}
        }
        return true
    }
}
