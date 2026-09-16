// Generated reference scenes from the native release capture harness.
import Foundation
#if PORT_TEST
func referenceCapture(_ view:FranchiseView,_ index:Int){
    let db=view.db
    var sample=Franchise.make(db:db,user:0,slot:1,fantasy:false,seed:2603)
    sample.options.injuryFrequency=0
    for p in sample.roster(0).prefix(4){_=sample.assignTraining(p.profile.id,ability:p.isPitcher ? 5:0,intensity:1)}
    for _ in 0..<30 {if sample.trainingDue{_=sample.completeTraining()}else{_=sample.step()}}
        view.profilePerformance=false;view.statsFielding=false;view.statsPitching=false;view.modal="";view.tourStep=nil;view.positionMenu=false;view.toastUntil=0;view.focus=0;view.hover = -1;view.career=sample;view.page="hub";view.tab=0;view.rosterPage=0;view.poolPage=0
        switch index{
        case 0:view.page="title"
        case 1:view.career=nil;view.page="setup"
        case 2:view.tab=0
        case 3:view.tab=1;view.selectedDay=sample.day;view.syncMonth()
        case 4:view.tab=2
        case 5:view.tab=3
        case 6:view.tab=4;view.selectedPlayer=sample.roster(0).first!.profile.id
        case 7:view.tab=5
        case 8:view.tab=6
        case 9:view.tab=7
        case 10:view.tab=8
        case 11:view.tab=1;view.boxGame=sample.schedule.last{$0.played && ($0.home==0 || $0.away==0)}?.id;view.modal="box"
        case 12:view.career=Franchise.make(db:db,user:0,slot:3,fantasy:true,seed:2603);view.page="draft"
        case 13:
            var final=sample
            for _ in 0..<600 {if final.champion != nil {break};if final.trainingDue{_=final.completeTraining()}else{_=final.step()}}
            view.career=final;view.modal="bracket"
        case 14:view.tab=10
        case 15:
            var farm=sample
            for p in farm.roster(0).filter({!farm.clubs[0].lineup.contains($0.profile.id) && !farm.clubs[0].rotation.contains($0.profile.id)}).prefix(3){_=farm.setFarm(p.profile.id,true)}
            farm.developFarm();view.career=farm;view.tab=11
        case 16:
            var health=sample;let i=health.players.firstIndex{$0.profile.id==health.clubs[0].lineup[0]}!;health.players[i].injury=PlayerInjury(name:"Muscle tightness",untilDay:health.day+4);view.career=health;view.tab=12
        case 17:view.modal="profile:"+(sample.roster(0).first{!$0.isPitcher && $0.profile.stats != nil}?.profile.id ?? sample.roster(0).first!.profile.id)
        case 18:view.tab=4;view.modal="presets"
        case 19:view.modal="objectives"
        case 22:view.tab=5;view.modal="facility:0"
        case 23:view.tab=2;view.notify("Lineup updated. Your former starter is now available on the bench.")
        case 24:view.tab=14;_=view.career?.hireCoach(sample.coachingCandidates(0)[1])
        case 25:view.tab=15
        case 26:view.tab=5;view.modal="tickets"
        case 27:
            var progress=sample;let id=progress.clubs[0].lineup[0];_=progress.assignTraining(id,ability:0,intensity:2)
            for week in 5..<13{progress.advanceTime(week*7);_=progress.completeTraining()}
            view.career=progress;view.tab=4;view.modal="progress:"+id
        case 28:view.modal="staffreport"
        case 29:view.tab=2;view.positionMenu=true
        case 30:view.tab=3;view.modal="bullpenreport"
        case 31:view.tab=0;view.hover=0
        case 32:view.tab=16;_=view.career?.signSponsor("action",slot:0);_=view.career?.signSponsor("lidl",slot:4)
        case 33:view.tab=16;view.sponsorSlot=1;view.modal="sponsoroffers"
        case 34:view.tab=16;view.sponsorSlot=0;_=view.career?.signSponsor("action",slot:0);view.modal="sponsoroffers"
        case 35:view.tab=16;view.career?.clubs[0].fans=12000;view.career?.offerSponsor("nike");view.sponsorSlot=1;view.modal="sponsorreview:nike"
        case 36:view.beginCareerTour()
        case 37:view.beginCareerTour();view.tourStep=4;view.showTourStep()
        case 38:view.tab=17;view.leagueRosterClub=1;view.leagueRosterFilter=0;view.leagueRosterPage=0
        case 39:view.tab=17;view.leagueRosterClub=1;view.modal="profile:"+view.leagueRosterPlayers()[0].profile.id
        case 40:view.tab=8;view.statsFielding=true;view.statsSort="PO"
        case 41:view.tab=18;for i in 0..<3{_=view.career?.orderMerchandise(i)};view.career?.day+=7;view.career?.settleClubCommerce()
        case 42:view.tab=5;view.modal="projects";_=view.career?.upgrade(7);_=view.career?.startClubProject("shop")
        case 43:view.tab=5;view.modal="project:outreach"
        case 44:view.tab=16;view.career?.sponsorMarket?.offers=[];view.career?.clubs[0].fans=5000;view.career?.offerSponsor("rawlings");view.career?.offerSponsor("b45");view.career?.offerSponsor("marucci");view.sponsorSlot=1;view.modal="sponsoroffers"
        case 48:view.tab=2;view.act("performance:"+sample.clubs[0].lineup[0])
        case 49:view.tab=3;view.act("performance:"+sample.clubs[0].rotation[0])
        case 47:view.modal="teamanalysis"
        case 46:view.tab=14;view.modal="staffcontract:"+sample.coachingCandidates(0)[2].id
        case 45:view.tab=16;view.career?.clubs[0].fans=20000;view.career?.offerSponsor("louisvuitton");view.sponsorSlot=1;view.modal="sponsorreview:louisvuitton"
        default:
            var playoffs=sample
            for _ in 0..<600{if playoffs.schedule.contains(where:{$0.played && $0.stage=="Semifinal"}){break};_=playoffs.step()}
            view.career=playoffs;view.tab=13
            if index==21{view.boxGame=playoffs.schedule.last{$0.played && $0.stage=="Semifinal"}?.id;view.modal="playoffnight"}
        }

    view.photoOffset=0;view.clock=0
}
#endif
