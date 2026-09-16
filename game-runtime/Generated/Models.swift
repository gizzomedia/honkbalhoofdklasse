import Foundation
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
