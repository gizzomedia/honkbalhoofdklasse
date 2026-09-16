import AppKit

struct FranchiseInterfacePreferences:Codable {
    var showCareerTour=true
    static func read(from directory:URL)->Self {
        guard let data=try? Data(contentsOf:directory.appendingPathComponent("interface-preferences.json")),let settings=try? JSONDecoder().decode(Self.self,from:data) else{return Self()}
        return settings
    }
    func write(to directory:URL)throws {
        try Foundation.FileManager().createDirectory(at:directory,withIntermediateDirectories:true)
        try JSONEncoder().encode(self).write(to:directory.appendingPathComponent("interface-preferences.json"),options:.atomic)
    }
}

struct FranchiseTourStep {
    let tab:Int,title:String,body:String
}

extension FranchiseView {
    var tourSteps:[FranchiseTourStep] {[
        .init(tab:0,title:"WELCOME TO YOUR FRANCHISE",body:"This is your matchday overview: the next opponent, projected starters, recent results and club objectives. Your career is paused during this tour. Nothing in your squad or finances is changed."),
        .init(tab:1,title:"YOU CONTROL THE CALENDAR",body:"Simulate your next game, a series, a week or a month. Days advance visibly. Press Space, click Stop or open a management tab to pause. Select a date to review its fixtures or an already played box score."),
        .init(tab:2,title:"BUILD YOUR LINEUP",body:"Select a batting slot, then choose a replacement from the bench on the right. Move hitters up or down and use the Field dropdown to set defense. Exact position eligibility matters: an out-of-position player carries a fielding penalty."),
        .init(tab:3,title:"USE YOUR WHOLE PITCHING STAFF",body:"Set the rotation and choose the next starter. Your bullpen takes over as pitchers tire; Bullpen Usage shows their actual appearances and innings. Watch readiness, and use Team → Health to manage injuries and simulation stops."),
        .init(tab:4,title:"DEVELOP PLAYERS EVERY WEEK",body:"Choose up to six players, an ability and an intensity. Your saved plan repeats each week; you do not need to rebuild it. Hitters and pitchers have different abilities. Training improves the actual skills behind OVR; small gains accumulate before the number rounds up."),
        .init(tab:11,title:"GIVE RESERVES TIME TO GROW",body:"Send eligible reserves to the farm and choose a development focus. Weekly development costs money; promote players when they are ready. Open a player card to inspect skills, approximate age and development history. Older players gradually decline between seasons."),
        .init(tab:5,title:"INVEST IN YOUR CLUB",body:"Review each facility before buying: the detail screen compares its current and next effect. Club Projects adds construction time and weekly upkeep. Upgrades can improve training, recovery, capacity or income. Ticket Forecast explains the trade-off between prices, attendance and matchday income. Merchandise lets you stock and price club products. Loans offers eligible reserves from other clubs."),
        .init(tab:14,title:"BUILD YOUR COACHING STAFF",body:"Hire hitting, pitching, development and fitness coaches. Better coaches cost more but provide stronger listed bonuses. Signing fees are immediate and salaries settle weekly. Keep a cash reserve for training and club operations."),
        .init(tab:16,title:"EARN BETTER SPONSORS",body:"Fill eight placements, from your cap and jerseys to the team bus. Sponsors approach gradually as your fanbase grows; only received offers appear. Review the annual fee and contract length before signing: slots remain occupied until expiry, and each brand can hold only one placement."),
        .init(tab:17,title:"EXPLORE EVERY CLUB'S ROSTER",body:"Choose any of the seven clubs to inspect its current career squad. Filter hitters, pitchers or farm players and open a player profile. Loans, injuries and development appear here as they change. Browsing another club does not change your own squad."),
        .init(tab:8,title:"FOLLOW THE LEAGUE",body:"League → Standings shows the race for the top four. Stats switches between hitters and pitchers, your club and the full league. Sort the columns to find leaders. Awards shows the current top three and keeps completed season awards."),
        .init(tab:13,title:"MAKE THE HOLLAND SERIES",body:"The top four qualify: first plays fourth, second plays third. Semifinals are best of five; the Holland Series is best of seven. Playoffs stop after each game, so you can review the bracket, adjust your team and then advance again."),
        .init(tab:15,title:"MANAGE AS MUCH AS YOU LIKE",body:"Delegate training plans, staff, lineups, rotation, tickets or facilities independently, or keep manual control. Saved training sessions run automatically by default. You can replay this tour here and change whether it appears for new careers. You're ready to build your club.")
    ]}
    func setShowCareerTour(_ enabled:Bool)->Bool {
        var updated=interfacePreferences;updated.showCareerTour=enabled
        do{try updated.write(to:store.directory);interfacePreferences=updated;return true}
        catch{notify("Could not save tour preference: "+error.localizedDescription);return false}
    }
    func beginCareerTour(automatic:Bool=false){
        guard career != nil,career?.draft==false,!automatic || interfacePreferences.showCareerTour else{return}
        stop();modal="";positionMenu=false;toastUntil=0;tourStep=0;showTourStep()
    }
    func showTourStep(){
        guard let step=tourStep,tourSteps.indices.contains(step)else{return}
        stop();page="hub";tab=tourSteps[step].tab;modal="";positionMenu=false;rosterPage=0;leagueRosterPage=0;leagueRosterFilter=0;leagueRosterClub=career?.user ?? 0
        selectedDay=career?.day ?? 0;syncMonth();focus=0;hover = -1;needsDisplay=true
    }
    func drawCareerTour(){
        guard let step=tourStep,tourSteps.indices.contains(step)else{return}
        let item=tourSteps[step]
        // Keep the actual tab visible; only the explanation panel accepts input.
        fill(rect(0,0,1600,900),ink.withAlphaComponent(0.72));fill(rect(45,603,1510,235),ink)
        fill(rect(45,603,1510,3),white.withAlphaComponent(0.13));fill(rect(45,603,1510*CGFloat(step+1)/CGFloat(tourSteps.count),3),accent)
        text("FRANCHISE TOUR · \(step+1) / \(tourSteps.count) · SIMULATION PAUSED",64,616,15,accent,"AvenirNext-DemiBold",1450)
        text(item.title,63,642,32,white,"Impact",1450)
        paragraph(item.body,66,687,1456,79,21,white)
        areas=[]
        button(step==tourSteps.count-1 ? "FINISH TOUR →":"NEXT →","tour:next",rect(1226,779,306,43),primary:true)
        button("SKIP TOUR","tour:skip",rect(64,779,193,43))
        button("DON'T SHOW ON NEW CAREERS","tour:never",rect(277,779,459,43))
        button("‹ PREVIOUS","tour:previous",rect(756,779,240,43),enabled:step>0)
    }
    func guideAction(_ action:String)->Bool {
        if action=="tour:start"{beginCareerTour();return true}
        if action=="tour:toggle"{_=setShowCareerTour(!interfacePreferences.showCareerTour);return true}
        if action.hasPrefix("tour:"){
            guard let step=tourStep else{return true}
            switch action{
            case "tour:next":if step+1<tourSteps.count{tourStep=step+1;showTourStep()}else{tourStep=nil;tab=0;focus=0}
            case "tour:previous":tourStep=max(0,step-1);showTourStep()
            case "tour:skip":tourStep=nil;focus=0
            case "tour:never":if setShowCareerTour(false){tourStep=nil;focus=0}
            default:break
            };return true
        }
        if tourStep != nil{return true}
        if action.hasPrefix("rosterclub:"),let c=Int(action.dropFirst(11)),db.teams.indices.contains(c){leagueRosterClub=c;leagueRosterPage=0;focus=0;return true}
        if action.hasPrefix("rosterfilter:"),let filter=Int(action.dropFirst(13)),(0...3).contains(filter){leagueRosterFilter=filter;leagueRosterPage=0;focus=0;return true}
        if action=="leagueroster:prev"{leagueRosterPage=max(0,leagueRosterPage-1);return true}
        if action=="leagueroster:next"{leagueRosterPage=min(max(0,(leagueRosterPlayers().count-1)/10),leagueRosterPage+1);return true}
        if action=="leagueroster:sort"{leagueRosterSort=(leagueRosterSort+1)%3;leagueRosterPage=0;return true}
        return false
    }
    func leagueRosterPlayers()->[FranchisePlayer]{
        guard let f=career,f.clubs.indices.contains(leagueRosterClub)else{return []}
        return f.roster(leagueRosterClub).filter{p in
            leagueRosterFilter==0 || (leagueRosterFilter==1 && p.canHit) || (leagueRosterFilter==2 && p.canPitch) || (leagueRosterFilter==3 && p.inFarm)
        }.sorted{a,b in
            if leagueRosterSort==0 && a.rating != b.rating{return a.rating>b.rating}
            if leagueRosterSort==1 && a.profile.birthYear != b.profile.birthYear{return (a.profile.birthYear ?? 0)>(b.profile.birthYear ?? 0)}
            return a.profile.name.localizedStandardCompare(b.profile.name) == .orderedAscending
        }
    }
    func managerLeagueRosters(){
        guard let f=career else{return}
        let selected=db.teams[leagueRosterClub],players=leagueRosterPlayers(),roster=f.roster(leagueRosterClub)
        image(selected.logo,rect(53,237,67,44));text(selected.name.uppercased(),137,234,36,white,"Impact",1060)
        text("\(roster.count) PLAYERS · CURRENT CAREER ROSTER",1117,248,16,selected.highlight,"AvenirNext-DemiBold",426)
        for (i,t) in db.teams.enumerated(){let x:CGFloat=51+CGFloat(i)*214,r=rect(x,289,201,54)
            fill(r,i==leagueRosterClub ? t.highlight.withAlphaComponent(0.22):ink);fill(rect(x,341,201,2),i==leagueRosterClub ? t.highlight:muted.withAlphaComponent(0.2));image(t.logo,rect(x+12,297,48,36));text(t.abbr,x+77,306,21,white,"AvenirNextCondensed-Heavy",110);hit("rosterclub:\(i)",t.name,r)
        }
        for (i,label) in ["ALL PLAYERS","HITTERS","PITCHERS","FARM"].enumerated(){button(label,"rosterfilter:\(i)",rect(51+CGFloat(i)*224,359,211,40),primary:leagueRosterFilter==i)}
        button("SORT: "+["OVR ↓","AGE ↑","NAME A–Z"][leagueRosterSort],"leagueroster:sort",rect(1134,359,410,40))
        for (label,x,w) in [("PLAYER",67.0,412.0),("POSITIONS",493.0,255.0),("OVR*",775.0,87.0),("AGE",892.0,84.0),("B / T",992.0,110.0),("STATUS",1128.0,244.0),("READY",1417.0,110.0)]{text(label,CGFloat(x),416,16,muted,"AvenirNext-DemiBold",CGFloat(w))}
        leagueRosterPage=min(leagueRosterPage,max(0,(players.count-1)/10))
        for (i,p) in players.dropFirst(leagueRosterPage*10).prefix(10).enumerated(){let y:CGFloat=450+CGFloat(i)*32,r=rect(51,y,1493,31)
            fill(r,ink.withAlphaComponent(i%2==0 ? 0.93:0.63));text(p.profile.name,67,y+3,22,white,"AvenirNextCondensed-Heavy",413);text(p.positionLabel,493,y+5,18,muted,"AvenirNextCondensed-DemiBold",257)
            text(String(p.rating),775,y+3,22,selected.highlight,"AvenirNextCondensed-Heavy",88);text(p.profile.birthYear.map{String(f.year-$0)} ?? "—",892,y+4,20,white,"Menlo",84);text("\(p.profile.bats ?? "—") / \(p.profile.throws ?? "—")",992,y+5,18,muted,"Menlo",112)
            let injured=(p.injury?.untilDay ?? -1)>f.day
            let status=injured ? "INJURED · \(p.injury!.untilDay-f.day)D":p.inFarm ? "FARM":p.loanOwner != nil ? "ON LOAN":f.clubs[leagueRosterClub].lineup.contains(p.profile.id) ? "LINEUP":f.clubs[leagueRosterClub].rotation.contains(p.profile.id) ? "ROTATION":p.canPitch && !p.canHit ? "BULLPEN":"RESERVE"
            text(status,1128,y+5,17,injured ? NSColor(hex:"E8A09E"):muted,"AvenirNext-DemiBold",244)
            fill(rect(1405,y+3,109,25),readyColor(p.readiness).withAlphaComponent(0.10));text("\(Int(p.readiness))%",1417,y+4,19,readyColor(p.readiness),"Menlo",100);hit("profile:"+p.profile.id,p.profile.name+" player profile",r)
        }
        if players.isEmpty{paragraph("No players in this category. Choose another filter or club.",67,476,1200,65,25,muted)}
        text("Select a player for abilities and season totals. Ages use season year minus birth year; unknown ages stay blank.",54,787,16,muted,"AvenirNext-DemiBold",992)
        button("‹ PREV","leagueroster:prev",rect(1069,785,157,45),enabled:leagueRosterPage>0)
        text("\(leagueRosterPage+1) / \(max(1,(players.count+9)/10))",1255,797,19,muted,"Menlo",102)
        button("NEXT ›","leagueroster:next",rect(1382,785,162,45),enabled:(leagueRosterPage+1)*10<players.count)
    }
}
