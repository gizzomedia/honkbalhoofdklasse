import AppKit
import Foundation

extension FranchiseView {
    func careerStatsModal()->Bool {
        guard modal.hasPrefix("careerstats:"),let f=career,let p=f.player(String(modal.dropFirst(12))) else{return false}
        text("CAREER RECORD",113,108,44,white,"Impact",1280)
        text(p.profile.name.uppercased(),116,164,24,accent,"AvenirNextCondensed-Heavy",1310)
        let rows=f.playerCareerRecords(p).sorted{$0.year>$1.year}
        button(["BATTING","PITCHING","FIELDING"][careerStatsRole],"careerstatrole",rect(116,217,233,40),primary:true)
        button(["ALL GAMES","REGULAR SEASON","POSTSEASON"][careerStatsScope],"careerstatscope",rect(367,217,289,40))
        button(careerStatsDetail ? "MAIN STATS":"MORE STATS","careerstatdetail",rect(674,217,233,40),enabled:careerStatsRole != 2)
        text("SIMULATED CAREER · LIVE TOTALS",931,231,15,muted,"AvenirNext-DemiBold",546)
        let batting=careerStatsDetail ? ["PA","R","2B","3B","BB","K","CS","OBP"]:["G","AB","H","HR","RBI","SB","AVG","OPS"]
        let pitching=careerStatsDetail ? ["RG","H","ER","HR","BB","K","K/9","BB/9"]:["G","GS","W","L","SV","IP","ERA","WHIP"]
        let columns=careerStatsRole==0 ? batting:careerStatsRole==1 ? pitching:["GDEF","INN","PO","A","E","TC","FLD%","OOP"]
        let previousPitching=statsPitching;statsPitching=careerStatsRole==1
        defer{statsPitching=previousPitching}
        text("SEASON / CLUB",127,284,17,muted,"AvenirNext-DemiBold",320)
        for (n,col) in columns.enumerated(){text(col,456+CGFloat(n)*126,284,17,muted,"AvenirNextCondensed-Heavy",118)}
        careerStatsPage=min(careerStatsPage,max(0,(rows.count-1)/8))
        for (n,row) in rows.dropFirst(careerStatsPage*8).prefix(8).enumerated(){let y:CGFloat=322+CGFloat(n)*39
            fill(rect(116,y,1363,37),ink.withAlphaComponent(n%2==0 ? 0.8:0.45))
            text("\(row.year)"+(row.year==f.year ? " *":""),128,y+5,20,white,"Menlo-Bold",115)
            text(row.clubs.map{db.teams[$0].abbr}.joined(separator:" / "),247,y+9,14,accent,"AvenirNextCondensed-DemiBold",196)
            let available=careerStatsScope==0 || row.completeSplits
            for (j,col) in columns.enumerated(){text(available ? statValue(row.stats(careerStatsScope),col):"—",456+CGFloat(j)*126,y+7,18,white,"Menlo",118)}
        }
        var total=SeasonStat();let included=rows.filter{careerStatsScope==0 || $0.completeSplits}
        for row in included{total.add(row.stats(careerStatsScope))}
        fill(rect(116,644,1363,46),accent.withAlphaComponent(0.17));text("CAREER TOTAL",129,657,21,accent,"AvenirNextCondensed-Heavy",305)
        for (j,col) in columns.enumerated(){text(statValue(total,col),456+CGFloat(j)*126,657,19,white,"Menlo-Bold",118)}
        let first=rows.map{$0.year}.min() ?? f.year
        let missing=first>2026 && !f.history.isEmpty
        text(missing ? "Archive available from \(first). Earlier seasons were not retained by this older save.":"* Current season in progress · Includes every club played for · Real 2026 source stats stay separate.",119,708,16,muted,"AvenirNext-DemiBold",1350)
        if included.count<rows.count{text("Some older season splits are unavailable; those rows are excluded from this split total.",119,732,15,muted,"AvenirNext-DemiBold",1350)}
        button("PLAYER CARD","careerstatback",rect(116,772,282,44))
        button("‹","careerstatprev",rect(1190,772,82,44),enabled:careerStatsPage>0)
        text("\(careerStatsPage+1) / \(max(1,(rows.count+7)/8))",1290,785,17,muted,"Menlo",94)
        button("›","careerstatnext",rect(1394,772,82,44),enabled:(careerStatsPage+1)*8<rows.count)
        return true
    }
    func careerStatsAction(_ action:String)->Bool {
        if action.hasPrefix("careerstats:"),let p=career?.player(String(action.dropFirst(12))){modal=action;careerStatsRole=p.isPitcher ? 1:0;careerStatsScope=0;careerStatsPage=0;careerStatsDetail=false;focus=0;return true}
        guard modal.hasPrefix("careerstats:") else{return false}
        switch action {
        case "careerstatrole":careerStatsRole=(careerStatsRole+1)%3;careerStatsDetail=false
        case "careerstatdetail":careerStatsDetail.toggle()
        case "careerstatscope":careerStatsScope=(careerStatsScope+1)%3
        case "careerstatprev":careerStatsPage=max(0,careerStatsPage-1)
        case "careerstatnext":careerStatsPage+=1
        case "careerstatback":modal="profile:"+String(modal.dropFirst(12))
        default:return false
        };return true
    }
}
