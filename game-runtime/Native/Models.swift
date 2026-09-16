import AppKit
import Foundation
import CoreText

struct Team: Codable {
    let id, name, sourceName, abbr, color, city, logo: String
    let photos: [String]
    var accent: NSColor { NSColor(hex: color) }
    var highlight: NSColor { id == "neptunus" ? NSColor(hex: "8BA8D7") : accent }
}
struct PlayerStats: Codable {
    let ab, pa, hits, runs, doubles, triples, hr, rbi, bb, so, sb, cs, games, outs, pitchH, pitchBB, pitchK, pitchHR, er, appearances, starts, saves: Int?
    var fieldPO:Int?=nil,fieldA:Int?=nil,fieldE:Int?=nil
    let avg, era: Double?
    let sourceURL, scope: String?
}
struct Player: Codable {
    let id, teamID, name, position: String
    let number, bats, `throws`, sourceID: String?
    let birthYear, ovr: Int?
    let stats: PlayerStats?
    var positions:[String]?=nil,positionAppearances:[String:Int]?=nil,positionSource:String?=nil,positionCoverage:String?=nil
}
struct Coach: Codable { let team, name, role: String }
struct Settings: Codable {
    var hitting = 0, pitching = 0, fielding = 0, difficulty = 2, innings = 3
    var reducedMotion = false, sound = true, language = 0, camera = 0, colorblind = false
    static let hitNames = ["Zone", "Directional", "Pure Analog", "Timing"]
    static let pitchNames = ["Meter", "Pulse", "Pure Analog", "Classic"]
    static let levels = ["Rookie Assist", "Rookie", "Veteran", "All-Star", "Hall of Fame", "Legend"]
}
final class Database {
    let root: URL
    var saveRoot: URL { root.path.contains(".app/Contents/Resources") ? root.deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent() : root }
    var teams: [Team] = [], players: [Player] = [], coaches: [Coach] = []
    var images: [String: NSImage] = [:]
    init(root: URL) {
        self.root = root
        let fonts=root.appendingPathComponent("Assets/Fonts")
        for name in ["RevolutionGothic_ExtraBold_It.otf","RevolutionGothic_ExtraBold.otf","RevolutionGothic_ExtraLight.otf","RevolutionGothic_Regular.otf"]{CTFontManagerRegisterFontsForURL(fonts.appendingPathComponent(name) as CFURL,.process,nil)}
        reload()
    }
    func read<T: Decodable>(_ file: String, as: T.Type) -> T? {
        let location = file.hasPrefix("Saves/") ? saveRoot : root
        guard let data = try? Data(contentsOf: location.appendingPathComponent(file)) else { return nil }
        return try? JSONDecoder().decode(T.self, from: data)
    }
    @discardableResult func reload() -> Bool {
        guard let t = read("Data/teams.json", as: [Team].self), t.count == 7,
              let p = read("Data/players.json", as: [Player].self), !p.isEmpty else { return false }
        teams = t; players = p; coaches = read("Data/staff.json", as: [Coach].self) ?? []
        return true
    }
    func roster(_ index: Int) -> [Player] { players.filter { $0.teamID == teams[index].id } }
    func lineup(_ index: Int) -> [Player] {
        Array(roster(index).filter { $0.position != "P" }.sorted { ($0.stats?.pa ?? 0) > ($1.stats?.pa ?? 0) }.prefix(9))
    }
    func image(_ path: String) -> NSImage? {
        if let i = images[path] { return i }
        guard let i = NSImage(contentsOf: root.appendingPathComponent(path)) else { return nil }
        images[path] = i; return i
    }
    func save<T: Encodable>(_ value: T, _ filename: String) {
        let dir = saveRoot.appendingPathComponent("Saves")
        try? Foundation.FileManager().createDirectory(at: dir, withIntermediateDirectories: true)
        if let data = try? JSONEncoder().encode(value) { try? data.write(to: dir.appendingPathComponent(filename), options: .atomic) }
    }
}
extension NSColor {
    convenience init(hex: String) {
        let n = UInt32(hex.replacingOccurrences(of: "#", with: ""), radix: 16) ?? 0
        self.init(srgbRed: CGFloat((n >> 16) & 255) / 255, green: CGFloat((n >> 8) & 255) / 255, blue: CGFloat(n & 255) / 255, alpha: 1)
    }
}

struct Match: Codable {
    var away: Int, home: Int, user: Int, scheduled: Int
    var inning = 1, bottom = false, outs = 0, balls = 0, strikes = 0
    var score = [0,0], hits = [0,0], errors = [0,0], order = [0,0]
    var bases = [false,false,false]
    var lines = [[Int](),[Int]()]
    var pitches = 0, complete = false, log: [String] = []
    var rng: UInt64 = 26092026
    var battingSide: Int { bottom ? 1 : 0 }
    var battingTeam: Int { bottom ? home : away }
    var fieldingTeam: Int { bottom ? away : home }
    var userBatting: Bool { battingTeam == user }
    mutating func random() -> Double {
        rng = rng &* 6364136223846793005 &+ 1442695040888963407
        return Double(rng >> 11) / Double(UInt64.max >> 11)
    }
    mutating func addRun() {
        let side = battingSide
        while lines[side].count < inning { lines[side].append(0) }
        score[side] += 1; lines[side][inning - 1] += 1
    }
    mutating func finishBatter() {
        order[battingSide] += 1; balls = 0; strikes = 0
        checkWalkoff()
    }
    mutating func checkWalkoff() {
        if bottom && inning >= scheduled && score[1] > score[0] { complete = true }
    }
    mutating func out(_ label: String) {
        log.append(label); outs += 1; finishBatter()
        if outs >= 3 {
            while lines[battingSide].count < inning { lines[battingSide].append(0) }
            outs = 0; bases = [false,false,false]
            if !bottom && inning >= scheduled && score[1] > score[0] { complete = true; return }
            if bottom {
                if inning >= scheduled && score[0] != score[1] { complete = true; return }
                inning += 1; bottom = false
            } else { bottom = true }
        }
    }
    mutating func strike(swinging: Bool = true) -> String {
        strikes += 1
        if strikes >= 3 { out("Strikeout"); return "STRIKEOUT" }
        return swinging ? "SWING AND A MISS" : "CALLED STRIKE"
    }
    mutating func foul() -> String { if strikes < 2 { strikes += 1 }; log.append("Foul ball"); return "FOUL BALL" }
    mutating func ball() -> String {
        balls += 1
        guard balls == 4 else { return "BALL" }
        if bases[0] {
            if bases[1] { if bases[2] { addRun() }; bases[2] = true }
            bases[1] = true
        }
        bases[0] = true; log.append("Walk"); finishBatter(); return "BALL FOUR"
    }
    mutating func hit(_ count: Int) -> String {
        hits[battingSide] += 1
        var next = [false,false,false]
        for i in (0..<3).reversed() where bases[i] {
            if i + count >= 3 { addRun() } else { next[i + count] = true }
        }
        if count >= 4 { addRun() } else { next[count - 1] = true }
        bases = next
        let text = ["", "SINGLE", "DOUBLE", "TRIPLE", "HOME RUN"][count]
        log.append(text); finishBatter(); return text
    }
}
