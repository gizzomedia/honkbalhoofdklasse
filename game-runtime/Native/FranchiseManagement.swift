import Foundation

struct ManagerCoach:Codable,Equatable {
    var id:String,name:String,role:Int,quality:Int,salary:Int
    var bonus:Double{Double(quality)*0.05}
    var signingFee:Int{quality>=5 ? 35000:quality>=3 ? 18000:7500}
}
let coachRoles=["Hitting coach","Pitching coach","Development coach","Fitness coach"]
struct ClubAutomation:Codable {
    var trainingPlan=false,staff=false,lineup=false,rotation=false,tickets=false,facilities=false
    var weeklyStaffBudget=1400,reserve=30000
}
struct DevelopmentSnapshot:Codable {
    var year:Int,day:Int,overall:Double,skills:[Double]
}
struct StaffAdvice {var title:String,detail:String,action:String}
extension FranchisePlayer {
    var overallValue:Double{max(40,min(99,72+(value-53)*1.6))}
}
extension Franchise {
    var automation:ClubAutomation {get{managementAutomation ?? ClubAutomation()}set{managementAutomation=newValue}}
    var staff:[ManagerCoach]{hiredStaff ?? []}
    var staffWeeklyCost:Int{staff.reduce(0){$0+$1.salary}}
    func coachBonus(_ role:Int)->Double{staff.first{$0.role==role}?.bonus ?? 0}
    func coachingCandidates(_ role:Int)->[ManagerCoach]{
        let first=["Milan","Ruben","Dario","Sven","Rafael","Jesse","Noah","Timo","Nico","Luca","Mateo","Finn"]
        let last=["Vermeer","De Bruin","Martina","Smit","Maduro","Bakker","Meijer","Van Dijk","Vos","Jansen","De Vries","Bos"]
        return (0..<3).map{tier in
            let index=(year+user*7+role*3+tier)%first.count
            let q=[1,3,5][tier],salary=[180,420,800][tier]
            return ManagerCoach(id:"\(year)-\(user)-\(role)-\(tier)",name:first[index]+" "+last[(index+role*2+tier)%last.count],role:role,quality:q,salary:salary)
        }
    }
    @discardableResult mutating func hireCoach(_ coach:ManagerCoach)->Bool {
        guard coachRoles.indices.contains(coach.role),coachingCandidates(coach.role).contains(coach),!staff.contains(coach),clubs[user].cash>=coach.signingFee+coach.salary else{return false}
        hiredStaff=staff.filter{$0.role != coach.role}+[coach]
        clubs[user].cash-=coach.signingFee;clubs[user].expenses+=coach.signingFee
        ledger.insert("\(dateLabel(day)): \(coach.name) signing fee −€\(coach.signingFee)",at:0)
        log("STAFF: \(coach.name) hired as \(coachRoles[coach.role]); €\(coach.salary) per week.")
        return true
    }
    mutating func fireCoach(_ role:Int){if let coach=staff.first(where:{$0.role==role}){hiredStaff=staff.filter{$0.role != role};log("STAFF: \(coach.name) leaves the club. No further weekly salary.")}}
    mutating func settleStaffPayroll(){
        for coach in staff.sorted(by:{$0.role<$1.role}) {
            if clubs[user].cash>=coach.salary{clubs[user].cash-=coach.salary;clubs[user].expenses+=coach.salary;ledger.insert("\(dateLabel(day)): staff \(coach.name) −€\(coach.salary)",at:0)}
            else{fireCoach(coach.role);log("Staff contract ended: insufficient funds for weekly salary.")}
        }
    }
    mutating func runWeeklyAutomation(){
        if automation.staff {
            for role in coachRoles.indices where !staff.contains(where:{$0.role==role}) {
                let share=max(0,automation.weeklyStaffBudget-staffWeeklyCost)/max(1,4-staff.count)
                if let coach=coachingCandidates(role).reversed().first(where:{$0.salary<=share && clubs[user].cash-$0.signingFee-$0.salary*8>=automation.reserve}){_=hireCoach(coach)}
            }
        }
        if automation.trainingPlan{applyPreset(options.trainingPreset)}
        if automation.tickets {
            let best=(8...22).max{ticketForecast(price:$0).net+ticketFanEffect($0)*200<ticketForecast(price:$1).net+ticketFanEffect($1)*200} ?? 12
            if clubs[user].ticket != best{clubs[user].ticket=best;log("AUTO: ticket price set to €\(best) balancing demand, matchday income and fan growth.")}
        }
        if automation.facilities {
            let choices=facilities.indices.filter{clubs[user].level($0)<facilities[$0].maxLevel}.sorted{upgradeCost($0)<upgradeCost($1)}
            if let kind=choices.first(where:{clubs[user].cash-upgradeCost($0)-staffWeeklyCost*8>=automation.reserve}){_=upgrade(kind)}
        }
    }
    mutating func prepareManagedTeam(){
        guard automation.lineup || automation.rotation else{return}
        let lineup=clubs[user].lineup,defense=clubs[user].defense,rotation=clubs[user].rotation,index=clubs[user].rotationIndex,override=clubs[user].nextStarter
        autoLineup(user)
        if !automation.lineup{clubs[user].lineup=lineup;clubs[user].defense=defense}
        if !automation.rotation{clubs[user].rotation=rotation;clubs[user].rotationIndex=index;clubs[user].nextStarter=override}
        else{clubs[user].rotationIndex=index;clubs[user].nextStarter=nil}
    }
    func projectedDemand(_ club:Int,price:Int,stage:String="Regular")->Double {
        Double(clubs[club].fans)*(0.70+Double(clubs[club].stadium)*0.045)*max(0.4,1-Double(price-12)*0.042)*(stage=="Holland Series" ? 1.4:1)*(club==user && hasProject("terrace") ? 1.05:1)
    }
    func ticketForecast(price:Int)->(fans:Int,gross:Int,net:Int){
        let attendees=max(80,min(clubs[user].capacity,Int(projectedDemand(user,price:price))))
        let gross=attendees*(price+3+clubs[user].level(7))
        return(attendees,gross,gross-2200-clubs[user].stadium*200)
    }
    var monthTarget:Int {
        var c=Calendar(identifier:.gregorian);c.timeZone=TimeZone(secondsFromGMT:0)!
        let next=c.date(byAdding:.month,value:1,to:date(day))!
        return c.dateComponents([.day],from:Self.baseDate(year),to:next).day!
    }
    @discardableResult mutating func setFieldPosition(slot:Int,position:String)->Bool {
        guard clubs[user].lineup.indices.contains(slot),defensePositions.contains(position),let other=clubs[user].defense.firstIndex(of:position) else{return false}
        clubs[user].defense.swapAt(slot,other);return true
    }
    mutating func recordDevelopment(){
        for i in players.indices where players[i].club>=0 {
            let skills=abilityNames.indices.map{players[i].skill($0)},point=DevelopmentSnapshot(year:year,day:day,overall:players[i].overallValue,skills:skills)
            var history=players[i].developmentHistory ?? []
            if let last=history.last,last.year==year,last.day==day,abs(last.overall-point.overall)<0.00001,last.skills==skills{continue}
            history.append(point);players[i].developmentHistory=Array(history.suffix(104))
        }
    }
    func staffAdvice()->[StaffAdvice]{
        var result=[StaffAdvice]()
        if let p=roster(user).filter({!$0.inFarm}).min(by:{$0.readiness<$1.readiness}),p.readiness<65 {
            result.append(.init(title:"Give \(p.profile.name) a rest",detail:"\(Int(p.readiness))% readiness. Review the lineup or next starter before the next game.",action:p.isPitcher ? "tab:3":"tab:2"))
        }
        if training.isEmpty{result.append(.init(title:"Set your development priorities",detail:"No individual sessions are planned. Choose up to six players or apply a preset.",action:"tab:4"))}
        if staff.count<4{result.append(.init(title:"Your staff has \(4-staff.count) vacancies",detail:"Hire a specialist for training growth or daily recovery. Current staff payroll: €\(staffWeeklyCost)/week.",action:"tab:14"))}
        if let p=recommendedTraining().first{result.append(.init(title:"Development watch: \(p.profile.name)",detail:"OVR \(p.rating). Check their abilities and training progress before assigning a focus.",action:"progress:\(p.profile.id)"))}
        let forecast=ticketForecast(price:clubs[user].ticket)
        result.append(.init(title:"Check matchday demand",detail:"At €\(clubs[user].ticket), forecast \(forecast.fans) attendees before matchday demand varies.",action:"tickets"))
        return Array(result.prefix(3))
    }
}

extension FranchisePlayer {
    // Gradual, deterministic career aging. Source statistics remain unchanged.
    mutating func applyAgeProgression(nextYear:Int){
        guard let birth=profile.birthYear else{return}
        let age=nextYear-birth
        let starts=[0:34,1:33,2:38,3:31,4:34,5:34,6:37,7:32,8:32,9:37,10:35,11:31]
        for ability in trainableAbilities {
            let start=starts[ability] ?? 35
            guard age>=start else{continue}
            let physical=[3,7,8,11].contains(ability)
            let loss=min(physical ? 3.4:2.2,(physical ? 0.45:0.22)+Double(age-start)*(physical ? 0.20:0.13))
            develop(ability,-loss)
        }
    }
}

struct TeamDiagnostic {
    var title:String,evidence:String,advice:String,action:String,concern:Bool
}
struct TeamAnalysis {
    var games=0,wins=0,runsFor=0,runsAgainst=0,previousGames=0,previousWins=0,boxGames=0
    var cards:[TeamDiagnostic]=[]
}
extension Franchise {
    func teamAnalysis()->TeamAnalysis {
        let played=schedule.filter{$0.played && !$0.cancelled && ($0.home==user || $0.away==user)}.sorted{$0.day==$1.day ? $0.id<$1.id:$0.day<$1.day}
        let recent=Array(played.suffix(10)),prior=Array(played.dropLast(recent.count).suffix(10))
        var result=TeamAnalysis(games:recent.count,wins:recent.filter{$0.winner==user}.count,previousGames:prior.count,previousWins:prior.filter{$0.winner==user}.count)
        for g in recent {result.runsFor+=(g.home==user ? g.homeRuns:g.awayRuns) ?? 0;result.runsAgainst+=(g.home==user ? g.awayRuns:g.homeRuns) ?? 0}
        guard let first=recent.first else {
            result.cards=[.init(title:"Build a match sample",evidence:"No completed games in this season.",advice:"Play several games before judging results. Check eligible positions and readiness now; individual results will fluctuate.",action:"tab:2",concern:false)]
            return result
        }
        var batting=SeasonStat(),pitching=SeasonStat(),relief=SeasonStat(),starters=SeasonStat(),league=SeasonStat(),errors=0,fieldingGames=0,leagueRuns=0,leagueTeamGames=0
        for g in recent {
            let own=g.box.filter{g.playerTeams[$0.key]==user}
            if !own.isEmpty{result.boxGames+=1}
            if own.contains(where:{$0.value.fielding != nil}){fieldingGames+=1}
            for (id,s) in own {batting.add(s);pitching.add(s);errors+=s.glove.errors;if g.starters.contains(id){starters.add(s)}else{relief.add(s)}}
        }
        for g in schedule where g.played && !g.cancelled && g.day>=first.day && g.day<=(recent.last?.day ?? day) {
            leagueRuns+=(g.homeRuns ?? 0)+(g.awayRuns ?? 0);leagueTeamGames+=2
            for s in g.box.values{league.add(s)}
        }
        func ratio(_ n:Int,_ d:Int,_ factor:Double=1)->String{d>0 ? String(format:"%.2f",Double(n)*factor/Double(d)):"—"}
        let lowScoring=leagueTeamGames>0 && Double(result.runsFor)/Double(max(1,result.games))<Double(leagueRuns)/Double(leagueTeamGames)*0.85
        let highK=batting.pa>0 && league.pa>0 && Double(batting.k)/Double(batting.pa)>Double(league.k)/Double(league.pa)+0.04
        let highWalks=pitching.outs>0 && league.outs>0 && Double(pitching.pbb)/Double(pitching.outs)>Double(league.pbb)/Double(league.outs)*1.2
        let poorRelief=relief.outs>=27 && starters.outs>0 && Double(relief.er)/Double(relief.outs)>Double(starters.er)/Double(starters.outs)*1.3
        result.cards.append(.init(title:"RUN PRODUCTION",evidence:"Runs/game \(ratio(result.runsFor,result.games)) · league \(ratio(leagueRuns,leagueTeamGames))\nK% \(ratio(batting.k,batting.pa,100)) · league \(ratio(league.k,league.pa,100)) · AVG \(batting.avg)",advice:highK ? "Strikeouts are elevated. Compare contact/vision in your lineup; train those abilities. A stronger contact bat can cost power.":lowScoring ? "Scoring is below the league window. Review batting order and contact, power and discipline. Give a change several games; hits do not always cluster into runs.":"No clear scoring shortfall in this window. Keep evaluating the batting order over several series; avoid reacting to a single quiet game.",action:"tab:2",concern:lowScoring || highK))
        result.cards.append(.init(title:"PITCHING & BULLPEN",evidence:"BB/9 \(ratio(pitching.pbb,pitching.outs,27)) · league \(ratio(league.pbb,league.outs,27))\nStarter ERA \(starters.era) (\(starters.ip) IP) · relief \(relief.era) (\(relief.ip) IP)",advice:highWalks ? "Extra walks create more baserunners. Compare control and readiness before choosing your starter. Control training takes weeks; rest can help sooner.":poorRelief ? "Relief ERA is higher in this sample. Review bullpen quality, readiness and hook settings. A quicker hook also increases bullpen workload.":"No strong walk or bullpen signal yet. Review rotation rest before games; short relief samples can swing sharply after one outing.",action:"tab:3",concern:highWalks || poorRelief))
        let wrong=clubs[user].lineup.enumerated().filter{!((player($0.element)?.fits(clubs[user].defense[$0.offset])) ?? true)}.count
        result.cards.append(.init(title:"DEFENSIVE EXECUTION",evidence:"\(errors) errors in \(fieldingGames) tracked games\nCurrent lineup: \(wrong) out-of-position assignment(s)",advice:wrong>0 ? "Current assignments increase the simulation's error risk. Put players at eligible positions, then weigh the defensive improvement against any weaker bat.":errors>0 ? "Errors allowed extra runners and extended innings. Compare fielding ability and readiness. Eligible positions help, but cannot remove all errors.":"No recorded errors in tracked games. Eligibility is a current-lineup check, not proof of how past games were lost. Older saves may have missing fielding records.",action:"tab:2",concern:wrong>0 || (fieldingGames>0 && Double(errors)/Double(fieldingGames)>1)))
        let activeIDs=Set(clubs[user].lineup+clubs[user].rotation),tired=roster(user).filter{activeIDs.contains($0.profile.id) && $0.readiness<70},hurt=injured(user)
        let names=tired.prefix(2).map{"\($0.profile.name) \(Int($0.readiness))%"}.joined(separator:" · ")
        result.cards.append(.init(title:"READINESS / CURRENT TEAM",evidence:"\(tired.count) lineup/rotation players below 70% readiness\n\(hurt.count) injured · \(names.isEmpty ? "No current fatigue flag":names)",advice:tired.isEmpty ? "No current fatigue warning. Recovery and training intensity still need balancing; this snapshot does not reconstruct readiness during earlier losses.":"Rest tired players or reduce training intensity. A rested reserve may outperform a fatigued starter; you trade immediate lineup quality for recovery.",action:"tab:12",concern:!tired.isEmpty || !hurt.isEmpty))
        return result
    }
}

extension FranchisePlayer {
    // Physical tools develop more slowly; strong existing skills have less headroom.
    func learningFactor(_ ability:Int)->Double {
        let pace:Double=[1,10].contains(ability) ? 0.80:([3,11].contains(ability) ? 0.65:1.0)
        return pace*max(0.20,min(1.15,(95-skill(ability))/45))
    }
}
extension Franchise {
    func plannedTrainingGain(_ p:FranchisePlayer,ability:Int,intensity:Int)->Double {
        guard clubs.indices.contains(p.club),p.trainableAbilities.contains(ability),p.available(day) else{return 0}
        let club=p.club,age=year-(p.profile.birthYear ?? year-28)
        let adjustedIntensity=(club != user || options.autoRest) && p.readiness<65 ? 0:intensity
        let ageFactor=age<24 ? 1.22:(age>34 ? 0.70:1.0),fatigueFactor=max(0.30,1-p.fatigue/125)
        let specialist=[2,9,6].contains(ability) ? Double(clubs[club].level(4))*0.06:([0,1].contains(ability) ? Double(clubs[club].level(5))*0.08:([5,10,11].contains(ability) ? Double(clubs[club].level(6))*0.08:0))
        let coach=club==user ? coachBonus([5,6,7,10,11].contains(ability) ? 1:0):0
        let gain=[0.14,0.24,0.36][max(0,min(2,adjustedIntensity))]*(1+Double(clubs[club].academy)*0.12+specialist+coach)*ageFactor*fatigueFactor*p.learningFactor(ability)
        return min(0.55,gain,max(0,95-p.skill(ability)))
    }
    func cpuTrainingOrders(_ club:Int)->[String:TrainingOrder] {
        guard club != user,clubs.indices.contains(club) else{return [:]}
        let pool=Array(roster(club).filter{$0.available(day)}.sorted{
            let left=$0.profile.birthYear ?? 1995,right=$1.profile.birthYear ?? 1995
            return left==right ? $0.profile.id<$1.profile.id:left>right
        }.prefix(12))
        guard !pool.isEmpty else{return [:]}
        var orders=[String:TrainingOrder]()
        for n in 0..<min(6,pool.count){let p=pool[(day/56*6+n)%pool.count]
            let targets:[Int:Double]=p.isPitcher ? [5:72,6:70,10:66,11:63,7:clubs[club].rotation.contains(p.profile.id) ? 70:60,4:58]:[0:72,1:68,2:68,9:68,4:65,3:60,8:58]
            let weights:[Int:Double]=p.isPitcher ? [5:0.32,6:0.25,7:0.20,10:0.10,11:0.10,4:0.03]:[0:0.38,1:0.27,2:0.20,3:0.05,4:0.04,8:0.03,9:0.03]
            let ability=p.abilities.max{a,b in (targets[a,default:60]-p.skill(a))*p.learningFactor(a)*weights[a,default:0.03]<(targets[b,default:60]-p.skill(b))*p.learningFactor(b)*weights[b,default:0.03]} ?? (p.isPitcher ? 5:0)
            orders[p.profile.id]=TrainingOrder(ability:ability,intensity:p.readiness<65 ? 0:1)
        }
        return orders
    }
}
