import AppKit
import Foundation
import Darwin

let app=NSApplication.shared
app.setActivationPolicy(.regular)
let executable=URL(fileURLWithPath:CommandLine.arguments[0]).standardizedFileURL
let root=ProcessInfo.processInfo.environment["HOOFDKLASSE_ROOT"].map{URL(fileURLWithPath:$0)} ?? executable.deletingLastPathComponent().deletingLastPathComponent().appendingPathComponent("Resources")
let db=Database(root:root)
guard db.teams.count==7 else{fputs("Franchise data failed to load.\n",stderr);exit(1)}
let saves=ProcessInfo.processInfo.environment["HOOFDKLASSE_SAVES"].map{URL(fileURLWithPath:$0)} ?? db.saveRoot.appendingPathComponent("Saves/Franchise")
let window=NSWindow(contentRect:.init(x:0,y:0,width:1440,height:810),styleMask:[.titled,.closable,.miniaturizable,.resizable],backing:.buffered,defer:false)
window.title="Honkbal Hoofdklasse — Franchise"
window.titleVisibility = .hidden;window.titlebarAppearsTransparent=true;window.backgroundColor = .black
window.contentAspectRatio = .init(width:16,height:9);window.minSize = .init(width:1024,height:576);window.collectionBehavior = [.fullScreenPrimary]
let view=FranchiseView(frame:.init(x:0,y:0,width:1440,height:810),db:db,saveDirectory:saves)
view.autoresizingMask=[.width,.height];window.contentView=view
let menu=NSMenu(),item=NSMenuItem();menu.addItem(item);let sub=NSMenu();sub.addItem(withTitle:"Quit Hoofdklasse Franchise",action:#selector(NSApplication.terminate(_:)),keyEquivalent:"q");item.submenu=sub;app.mainMenu=menu
window.acceptsMouseMovedEvents=true
window.center();window.makeKeyAndOrderFront(nil);window.makeFirstResponder(view);app.activate(ignoringOtherApps:true)

if let index=CommandLine.arguments.firstIndex(of:"--capture"),CommandLine.arguments.count>index+1 {
    let output=URL(fileURLWithPath:CommandLine.arguments[index+1]);try? Foundation.FileManager().createDirectory(at:output,withIntermediateDirectories:true)
    view.timer?.invalidate();view.clock=0
    var sample=Franchise.make(db:db,user:0,slot:1,fantasy:false,seed:2603)
    sample.options.injuryFrequency=0
    for p in sample.roster(0).prefix(4){_=sample.assignTraining(p.profile.id,ability:p.isPitcher ? 5:0,intensity:1)}
    for _ in 0..<30 {if sample.trainingDue{_=sample.completeTraining()}else{_=sample.step()}}
    let names=["01-title","02-club-select","03-overview","04-calendar","05-lineup","06-pitching","07-training","08-club-upgrades","09-loans","10-standings","11-stats","12-box-score","13-draft","14-playoffs","15-awards","16-farm","17-health","18-player-card","19-training-presets","20-objectives","21-playoff-hub","22-playoff-result","23-upgrade-detail","24-lineup-notification","25-staff","26-settings","27-tickets","28-development-history","29-staff-report","30-position-dropdown","31-bullpen","32-hover","33-sponsors","34-sponsor-market","35-sponsor-contract","36-premium-sponsors","37-career-tour","38-training-tour","39-league-rosters","40-opponent-profile","41-fielding-stats","42-merchandise","43-club-projects","44-project-review","45-baseball-sponsor","46-luxury-sponsor","47-staff-contract","48-team-analysis","49-batter-performance","50-pitcher-performance"]
    var index=0
    func next(){guard index<names.count else{app.terminate(nil);return}
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
        view.needsDisplay=true
        DispatchQueue.main.asyncAfter(deadline:.now()+0.12){
            if index==31 {view.hover=10}
            let image=NSImage(size:.init(width:1600,height:900));image.lockFocusFlipped(true)
            let old=view.frame;view.frame = .init(x:0,y:0,width:1600,height:900);view.draw(view.bounds);view.frame=old;image.unlockFocus()
            if let tiff=image.tiffRepresentation,let rep=NSBitmapImageRep(data:tiff),let bytes=rep.representation(using:.jpeg,properties:[.compressionFactor:0.92]){try? bytes.write(to:output.appendingPathComponent(names[index]+".jpg"))}
            index+=1;next()
        }
    }
    DispatchQueue.main.asyncAfter(deadline:.now()+0.5){next()}
}
if CommandLine.arguments.contains("--self-test-ui") {
    view.timer?.invalidate()
    var checks=0
    func checkUI(_ ok:@autoclosure ()->Bool,_ message:String){checks+=1;if !ok(){fputs("UI FAIL: "+message+"\n",stderr);exit(1)}}
    _=view.setShowCareerTour(true)
    view.act("new:3");view.act("team:0");view.act("real");view.act("create")
    checkUI(view.tourStep==0 && view.tab==0 && !view.autoSim,"New real career opens paused tour")
    view.act("tour:skip")
    checkUI(view.page=="hub" && view.career!.trainingDue,"Create real club")
    view.career!.options.automaticTraining=false;view.career!.options.injuryFrequency=0
    let id=view.career!.roster(0).first!.profile.id
    view.act("tab:4");view.act("select:"+id);view.act("ability:5");view.act("intensity:2");view.act("trainassign:"+id)
    checkUI(view.career!.training[id]?.ability==5,"Assign specific training")
    view.act("trainconfirm");checkUI(view.modal=="training","Training review")
    view.act("applytraining");view.act("close")
    checkUI(view.career!.player(id)!.growth[5]>0 && !view.autoSim,"Apply training and stay paused")
    view.act("tab:2");let before=view.career!.clubs[0].lineup;view.act("slot:1");view.act("orderup")
    checkUI(view.career!.clubs[0].lineup[0]==before[1],"Reorder batting lineup")
    view.act("tab:3");view.act("rotation:2");view.act("startnext")
    let starter=view.career!.clubs[0].rotation[2]
    checkUI(view.career!.clubs[0].nextStarter==starter,"Choose starter")
    view.act("tab:0");view.act("simweek");checkUI(view.autoSim,"Start simulation")
    view.act("tab:7");checkUI(!view.autoSim,"Standings navigation stops simulation")
    let oldDay=view.career!.day
    for _ in 0..<30{view.tick()};checkUI(view.career!.day==oldDay,"Stopped timer cannot simulate")
    view.act("simweek");view.act("stop");checkUI(!view.autoSim,"Explicit stop")
    view.act("tab:1");view.act("day:4");view.act("simdate")
    for _ in 0..<200{view.tick();if !view.autoSim{break}}
    checkUI(view.career!.day==4 && !view.autoSim,"Friday date stop does not overshoot to Saturday")
    checkUI(view.career!.schedule.filter{$0.played}.count==3,"All Thursday games played before Friday pause")
    let g=view.career!.schedule.first{$0.played && ($0.home==0 || $0.away==0)}!
    checkUI(g.starters[g.home==0 ? 1:0]==starter,"UI starter choice enters box score")
    checkUI(g.battingOrders[g.home==0 ? 1:0][0]==before[1],"UI batting order enters simulation")
    view.act("day:5");view.act("simdate")
    for _ in 0..<250{view.tick();if !view.autoSim{break}}
    checkUI(view.career!.schedule.filter{$0.played}.count==9 && view.career!.day==5,"Selected date finishes every doubleheader")
    let cash=view.career!.clubs[0].cash;view.act("upgrade:2")
    checkUI(view.career!.clubs[0].academy==1 && view.career!.clubs[0].cash<cash,"Upgrade affects career")
    let saved=view.career!;view.act("exit");view.act("load:3")
    checkUI(view.career!.clubs[0].lineup==saved.clubs[0].lineup && view.career!.player(id)!.growth==saved.player(id)!.growth && view.career!.rng==saved.rng,"Continue preserves decisions and RNG")
    view.act("simweek");for _ in 0..<150{view.tick();if !view.autoSim{break}}
    checkUI(view.career!.trainingDue && view.tab==4 && !view.autoSim,"Weekly checkpoint stops automatically")
    view.act("new:2");view.act("team:4");view.act("fantasy");view.act("create")
    checkUI(view.page=="draft" && view.career!.draftTeam==4,"Fantasy draft starts with selected club")
    view.act("draftbest");checkUI(view.career!.roster(4).count==1,"User pick and CPU draft turns")
    view.act("autodraft");checkUI(view.tourStep==0,"Completed fantasy draft opens career tour");view.act("tour:skip");checkUI(view.page=="hub" && view.career!.clubs.allSatisfy{$0.roster.count==25},"Autofinish creates seven complete squads")
    view.act("tab:4");view.act("trainfilter:2");view.act("trainsort")
    checkUI(view.trainingFilter==2 && view.trainingSort==2,"Pitcher filtering and rating sorting")
    view.act("presets");view.act("preset:2");checkUI(view.career!.training.keys.allSatisfy{view.career!.player($0)!.canPitch},"Pitching training preset")
    view.act("tab:12");view.career!.options.injuryFrequency=0
    if !view.career!.options.automaticTraining{view.act("option:auto")}
    view.act("simclub");for _ in 0..<250{view.tick();if !view.autoSim{break}}
    checkUI(view.career!.schedule.contains{$0.played && ($0.home==4 || $0.away==4)} && !view.autoSim,"Sim your matchup stops after your game")
    checkUI(!view.career!.trainingDue,"Training applied automatically without a weekly confirmation")
    view.act("tab:8");view.act("statspage");view.act("sortstat:SB")
    checkUI(view.statsPage==1 && view.statsSort=="SB","Expanded stats page and sorting")
    let player=view.career!.roster(4).first!.profile.id
    view.act("profile:"+player);checkUI(view.modal=="profile:"+player,"Individual evidence-based player card opens")
    view.act("close");view.act("tab:10");checkUI(view.tab==10,"Award races accessible")
    view.act("tab:11");let reserve=view.career!.roster(4).first{!view.career!.clubs[4].lineup.contains($0.profile.id) && !view.career!.clubs[4].rotation.contains($0.profile.id)}!
    view.act("farmdown:"+reserve.profile.id);checkUI(view.career!.player(reserve.profile.id)!.inFarm,"Reserve can join development squad from UI")
    view.act("farmfocus:"+reserve.profile.id);view.act("farmup:"+reserve.profile.id)
    checkUI(!view.career!.player(reserve.profile.id)!.inFarm,"Farm focus and promotion controls")
    view.act("objectives");checkUI(view.modal=="objectives","Club objectives accessible")
    view.act("close");view.act("tab:5");view.act("upgrade:3")
    checkUI(view.career!.clubs[4].level(3)==1,"Medical facility upgrade control")
    view.act("exit");view.act("load:2");checkUI(view.career!.clubs[4].level(3)==1 && view.career!.options.automaticTraining,"New management decisions persist")
    var bridge=Franchise.make(db:db,user:0,slot:1,fantasy:false,seed:499)
    bridge.options.injuryFrequency=0;bridge.options.pauseLowFunds=false
    while bridge.schedule.filter({$0.stage=="Regular" && !$0.played}).count>1{_=bridge.step()}
    view.career=bridge;view.tab=0;view.modal="";view.act("simclub")
    for _ in 0..<1800{view.tick();if !view.autoSim{break}}
    checkUI(view.modal=="playoffnight" && view.career!.schedule.filter{$0.stage=="Semifinal" && $0.played}.count==1,"Normal sim crosses regular-season boundary into first playoff without detour")
    var follow=bridge
    let finalRegular=follow.schedule.firstIndex{!$0.played && $0.stage=="Regular"}!
    follow.schedule[finalRegular].home=1;follow.schedule[finalRegular].away=2
    view.career=follow;view.modal="";view.tab=0;view.act("simclub")
    checkUI(view.autoSim,"Continue works when own regular fixtures finished before league")
    view.act("stop")
    var playoffs=Franchise.make(db:db,user:0,slot:1,fantasy:false,seed:412)
    playoffs.options.injuryFrequency=0
    for _ in 0..<500{if !playoffs.seeds.isEmpty{break};_=playoffs.step()}
    view.career=playoffs;view.page="hub";view.modal="";view.tab=13
    view.act("simplayoff");let beforeDay=view.career!.day;view.simulateOne(stopAt:view.simStopDay)
    checkUI(view.career!.day==beforeDay+1,"Calendar visibly advances only one day per simulation update")
    for _ in 0..<1500{view.tick();if !view.autoSim{break}}
    checkUI(view.modal=="playoffnight" && !view.autoSim,"Playoff result gets its own paused presentation")
    checkUI(view.career!.schedule.filter{$0.stage=="Semifinal" && $0.played}.count==1,"Playoff advance simulates exactly one semifinal")
    checkUI(view.selectedDay==view.career!.day,"Calendar highlight follows simulation date")
    view.act("playoffhub");view.act("simplayoff")
    for _ in 0..<400{view.tick();if !view.autoSim{break}}
    checkUI(view.career!.schedule.filter{$0.stage=="Semifinal" && $0.played}.count==2,"Each playoff game requires its own advance")
    view.career=Franchise.make(db:db,user:0,slot:1,fantasy:false,seed:88);view.modal="";view.act("group:1")
    checkUI(view.tab==2 && view.navigationGroup==1,"Team group opens lineup")
    let bench=view.benchPlayers(),outgoing=view.career!.clubs[0].lineup[0]
    checkUI(!bench.isEmpty && bench.allSatisfy{!view.career!.clubs[0].lineup.contains($0.profile.id)},"Bench list excludes all starters")
    view.lineupSlot=0;view.act("lineup:"+bench[0].profile.id)
    checkUI(!view.benchPlayers().contains{$0.profile.id==bench[0].profile.id} && view.benchPlayers().contains{$0.profile.id==outgoing},"Substitution exchanges incoming and outgoing bench membership")
    checkUI(Set(view.navigationGroups.flatMap{$0.1})==Set(0..<19),"Every management screen remains reachable")
    view.act("group:3");view.act("facility:0")
    checkUI(view.modal=="facility:0","Upgrade opens effect comparison before purchase")
    view.act("upgrade:0");checkUI(view.modal.isEmpty && view.career!.clubs[0].stadium==1,"Upgrade purchase activates facility and closes comparison")
    view.act("tab:2")
    let render=NSImage(size:.init(width:1600,height:900));render.lockFocusFlipped(true);view.draw(view.bounds);render.unlockFocus()
    checkUI(view.areas.allSatisfy{!$0.rect.intersects(view.notificationRect)},"Notification occupies reserved footer with no button overlap")
    view.career=Franchise.make(db:db,user:0,slot:1,fantasy:false,seed:92);view.career!.options.injuryFrequency=0
    checkUI(NSFont(name:"RevolutionGothic-ExtraBold",size:20) != nil,"Bundled Hoofdklasse font registers")
    view.act("tab:2");view.act("fieldpos");checkUI(view.positionMenu,"Position control opens dropdown")
    view.act("setfield:SS");checkUI(!view.positionMenu && view.career!.clubs[0].defense[view.lineupSlot]=="SS","Dropdown applies direct field assignment")
    let lineupBeforeProfile=view.career!.clubs[0].lineup,rotationBeforeProfile=view.career!.clubs[0].rotation
    view.act("performance:"+lineupBeforeProfile[0]);checkUI(view.profilePerformance && view.modal=="profile:"+lineupBeforeProfile[0],"Lineup name opens season performance")
    view.act("close");view.act("tab:3");view.act("performance:"+rotationBeforeProfile[0]);checkUI(view.profilePerformance && view.profilePitching,"Pitcher name defaults to pitching performance")
    view.act("close");checkUI(view.career!.clubs[0].lineup==lineupBeforeProfile && view.career!.clubs[0].rotation==rotationBeforeProfile,"Viewing performance does not change selection or assignments")
    view.act("autolineup");view.act("tab:4");view.trainingSort=1
    let development=view.developmentPlayers();checkUI(zip(development,development.dropFirst()).allSatisfy{$0.rating >= $1.rating},"Development sorts OVR descending")
    view.act("tab:14");view.act("staffrole:1");view.act("hirecoach:0")
    let unsignedCash=view.career!.clubs[0].cash,staffCandidate=view.career!.coachingCandidates(1)[0]
    checkUI(view.modal=="staffcontract:"+staffCandidate.id && view.career!.staff.isEmpty,"Coach review opens agreement before hiring")
    view.act("close");checkUI(view.career!.clubs[0].cash==unsignedCash && view.career!.staff.isEmpty,"Closing agreement does not spend money")
    view.act("hirecoach:0");view.act("signcoach:"+staffCandidate.id)
    checkUI(view.career!.staff.first?.role==1 && view.career!.clubs[0].cash==unsignedCash-staffCandidate.signingFee,"Staff signature deducts exact fee and hires coach")
    view.act("signcoach:"+staffCandidate.id);checkUI(view.career!.clubs[0].cash==unsignedCash-staffCandidate.signingFee,"Repeated signature cannot charge again")
    view.act("tab:15");view.act("automate:staff");checkUI(view.career!.automation.staff,"Staff automation toggle persists")
    view.act("tickets");checkUI(view.modal=="tickets","Ticket impact forecast opens")
    view.act("close");view.act("tab:0");let monthTarget=view.career!.monthTarget;view.act("simmonth")
    for _ in 0..<1500{view.tick();if !view.autoSim{break}}
    checkUI(view.career!.day==monthTarget && !view.autoSim,"One-month simulation stops at the correct calendar date")
    let analysisCash=view.career!.clubs[0].cash,analysisRNG=view.career!.rng
    view.act("teamanalysis");checkUI(view.modal=="teamanalysis" && view.career!.clubs[0].cash==analysisCash && view.career!.rng==analysisRNG,"Team analysis opens without spending or changing simulation")
    view.act("analysisreview:tab:3");checkUI(view.modal.isEmpty && view.tab==3,"Analysis recommendation links to pitching without auto-fixing")
    view.act("bullpenreport");checkUI(view.modal=="bullpenreport" && view.career!.players.contains{($0.totals.x.reliefGames ?? 0)>0},"Bullpen usage report reflects simulated appearances")
    let tracked=view.career!.clubs[0].lineup[0];view.act("progress:"+tracked);checkUI(view.modal.hasPrefix("progress:"),"Development history opens")
    view.act("close");view.act("tab:16");view.act("sponsorslot:0");let receivedBrand=view.career!.receivedSponsorBrands().first!.id;view.act("sponsoroffer:"+receivedBrand)
    checkUI(view.modal=="sponsorreview:"+receivedBrand,"Sponsor offer review opens")
    view.act("signsponsor:"+receivedBrand);checkUI(view.career!.sponsors.contains{$0.brandID==receivedBrand},"Sponsor signing works from UI")
    checkUI(db.image("Assets/Sponsors/nike.png") != nil && db.image("Assets/Sponsors/underarmour.png") != nil,"Requested sponsor logos are bundled")
    view.act("close");view.act("tour:start")
    let tourEncoder=JSONEncoder();tourEncoder.outputFormatting=[.sortedKeys]
    let beforeTour=try! tourEncoder.encode(view.career!)
    let startingTourTab=view.tab
    view.act("simmonth");view.act("ticketup")
    checkUI(!view.autoSim && view.tab==startingTourTab && (try! tourEncoder.encode(view.career!))==beforeTour,"Tour blocks gameplay actions and leaves career unchanged")
    for step in view.tourSteps.indices {
        checkUI(view.tourStep==step && view.tab==view.tourSteps[step].tab,"Tour opens the correct tab at step \(step+1)")
        render.lockFocusFlipped(true);view.draw(view.bounds);render.unlockFocus()
        checkUI(view.areas.allSatisfy{$0.action.hasPrefix("tour:")} && view.areas.contains{$0.action=="tour:next"},"Only tour controls remain interactive")
        view.act("tour:next")
    }
    checkUI(view.tourStep==nil && view.tab==0 && (try! tourEncoder.encode(view.career!))==beforeTour,"Finishing tour returns to overview without changing career")
    view.act("tour:start");view.act("tour:next");view.act("tour:previous")
    checkUI(view.tourStep==0 && view.tab==0,"Tour previous button revisits the correct tab")
    view.act("tour:skip");checkUI(view.tourStep==nil && view.interfacePreferences.showCareerTour,"Skip dismisses only this tour")
    view.act("tour:start");view.act("tour:never")
    checkUI(view.tourStep==nil && !FranchiseInterfacePreferences.read(from:view.store.directory).showCareerTour,"Don't show again persists across career slots")
    view.act("new:3");view.act("real");view.act("create")
    checkUI(view.tourStep==nil,"Opted-out new career skips tour")
    view.act("tour:start");checkUI(view.tourStep==0 && !view.interfacePreferences.showCareerTour,"Manual replay remains available after opting out")
    view.act("tour:skip");view.act("tour:toggle")
    checkUI(FranchiseInterfacePreferences.read(from:view.store.directory).showCareerTour,"Settings can restore automatic tour")
    view.act("exit");view.act("load:3");checkUI(view.tourStep==nil,"Loading an existing career does not restart onboarding")
    view.act("tab:17")
    for club in db.teams.indices {
        view.act("rosterclub:\(club)");view.act("rosterfilter:0")
        checkUI(Set(view.leagueRosterPlayers().map{$0.profile.id})==Set(view.career!.roster(club).map{$0.profile.id}),"League roster shows club \(club)'s current players")
        view.act("rosterfilter:1");checkUI(view.leagueRosterPlayers().allSatisfy{$0.canHit},"Roster hitter filter")
        view.act("rosterfilter:2");checkUI(view.leagueRosterPlayers().allSatisfy{$0.canPitch},"Roster pitcher filter")
        view.act("rosterfilter:3");checkUI(view.leagueRosterPlayers().allSatisfy{$0.inFarm},"Roster farm filter")
    }
    view.act("rosterclub:1");view.act("rosterfilter:0");let rosterBeforeBrowse=try! tourEncoder.encode(view.career!)
    let currentRoster=view.leagueRosterPlayers()
    checkUI(zip(currentRoster,currentRoster.dropFirst()).allSatisfy{$0.rating >= $1.rating},"League roster defaults to descending OVR")
    let rosterID=currentRoster[0].profile.id
    view.act("profile:"+rosterID);checkUI(view.modal=="profile:"+rosterID && view.career!.player(rosterID)?.club==1,"Other club player profile opens")
    view.act("close");view.act("leagueroster:next")
    checkUI(view.leagueRosterPage==1,"League roster next page")
    view.act("rosterclub:2");checkUI(view.leagueRosterPage==0 && view.modal.isEmpty,"Switching club resets paging")
    checkUI((try! tourEncoder.encode(view.career!))==rosterBeforeBrowse,"Roster browsing never modifies career state")
    view.act("tab:18");let stockBefore=view.career!.merch.stock[0];view.act("merchorder:0")
    checkUI(view.career!.merch.stock[0]==stockBefore+25,"Merchandise inventory purchase works from UI")
    view.act("merchprice:0");checkUI(view.career!.merch.pricing[0]==2,"Merch price tier updates")
    view.act("merchauto");checkUI(view.career!.merch.autoRestock,"Auto restock can be selected")
    view.act("projects");view.act("project:shop");checkUI(view.modal=="project:shop","Investment review opens")
    view.act("close");view.act("tab:8");view.statsFielding=false;view.statsPitching=false
    view.act("statstype");view.act("statstype");checkUI(view.statsFielding && view.statColumns().contains("E"),"Fielding category exposes errors and innings")
    view.act("statstype");checkUI(!view.statsFielding && !view.statsPitching,"Stats categories cycle back to batting")
    for brand in sponsorBrands{checkUI(db.image("Assets/Sponsors/\(brand.logo).png") != nil,"Every real sponsor has its bundled logo")}
    view.act("tab:2");view.act("fieldpos")
    render.lockFocusFlipped(true);view.draw(view.bounds);render.unlockFocus()
    let lineupPlayer=view.career!.player(view.career!.clubs[view.career!.user].lineup[view.lineupSlot])!
    let choices=view.areas.filter{$0.action.hasPrefix("setfield:")}.map{String($0.action.dropFirst(9))}
    checkUI(!choices.isEmpty && choices.allSatisfy{lineupPlayer.fits($0)},"Position dropdown contains only eligible choices")
    print("PASS: \(checks) native UI action checks")
    exit(0)
}
app.run()
