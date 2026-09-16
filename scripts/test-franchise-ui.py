from pathlib import Path
import subprocess,re
root=Path(__file__).resolve().parents[1];work=root/'game-runtime/.test-native/ui';work.mkdir(parents=True,exist_ok=True)
s=(root/'game-runtime/Native/main.swift').read_text();s=s.split('if CommandLine.arguments.contains("--self-test-ui") {',1)[1].rsplit('\n}\napp.run()',1)[0]
s=s.replace('view.timer?.invalidate()','').replace('let render=NSImage(size:.init(width:1600,height:900));','').replace('render.lockFocusFlipped(true);','').replace(';render.unlockFocus()','').replace('view.bounds','.zero')
s=s.replace('NSFont(name:"RevolutionGothic-ExtraBold",size:20) != nil','FileManager.default.fileExists(atPath:root.appendingPathComponent("Assets/Fonts/RevolutionGothic_ExtraBold.otf").path)')
s=s.replace('db.image("Assets/Sponsors/\\(brand.logo).png") != nil','FileManager.default.fileExists(atPath:root.appendingPathComponent("Assets/Sponsors/\\(brand.logo).png").path)')
s=re.sub(r'db.image\(("[^"]+")\) != nil',r'FileManager.default.fileExists(atPath:root.appendingPathComponent(\1).path)',s)
preamble='''import Foundation
import Darwin
let root=URL(fileURLWithPath:CommandLine.arguments[1])
for name in ["teams","players","staff"]{Database.input["Data/\\(name).json"]=try String(contentsOf:root.appendingPathComponent("Data/\\(name).json"),encoding:.utf8)}
let db=Database(root:root),view=FranchiseView(frame:.zero,db:Database(root:root),saveDirectory:URL(fileURLWithPath:"/"))
'''
(work/'main.swift').write_text(preamble+s)
files=list((root/'game-runtime/Generated').glob('*.swift'))+[root/'game-runtime/Adapter/Platform.swift',work/'main.swift']
subprocess.run(['swiftc','-O','-module-cache-path',str(work/'cache'),*map(str,files),'-o',str(work/'run')],check=True)
subprocess.run([str(work/'run'),str(root/'public/franchise')],check=True)
