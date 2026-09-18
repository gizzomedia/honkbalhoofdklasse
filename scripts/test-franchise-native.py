"""Run the original assertions against platform-adapted Swift.
File corruption tests use the browser in-memory store, preserving assertions.
"""
from pathlib import Path
import subprocess
root=Path(__file__).resolve().parents[1];work=root/'game-runtime/.test-native';work.mkdir(exist_ok=True)
s=(root/'game-runtime/Tests/engine-original.swift.txt').read_text()
s=s.replace('let db=Database(root:root)', '''for name in ["teams","players","staff"]{Database.input["Data/\\(name).json"]=try String(contentsOf:root.appendingPathComponent("Data/\\(name).json"),encoding:.utf8)}
let db=Database(root:root)''')
s=s.replace('try Data("broken".utf8).write(to:store.path(1))','BrowserStorage.files["franchise-1.json"]="broken"')
s=s.replace('root.deletingLastPathComponent().deletingLastPathComponent().appendingPathComponent("work/franchise/action-test-saves/franchise-3.json")', 'URL(fileURLWithPath:CommandLine.arguments[2])')
s=s.replace('try FileManager.default.removeItem(at:temp)','').replace('try FileManager.default.removeItem(at:newTemp)','')
# Annual CPU intake adds new IDs. Compare incumbent players with their actual baseline;
# academy recruitment/development is covered independently by test-franchise-growth.py.
s=s.replace('let gains=cpuGrowth.roster(club).map{p in p.overallValue-cpuStart.first{$0.profile.id==p.profile.id}!.overallValue}', 'let gains=cpuGrowth.roster(club).compactMap{p -> Double? in guard let initial=cpuStart.first(where:{$0.profile.id==p.profile.id}) else{return nil};return p.overallValue-initial.overallValue}')
(work/'main.swift').write_text(s)
files=list((root/'game-runtime/Generated').glob('*.swift'))+[root/'game-runtime/Adapter/Platform.swift',work/'main.swift']
subprocess.run(['swiftc','-O','-module-cache-path',str(work/'cache'),*map(str,files),'-o',str(work/'run')],check=True)
subprocess.run([str(work/'run'),str(root/'public/franchise'),str(root/'game-runtime/Tests/Fixtures/legacy-0.3.json')],check=True)
