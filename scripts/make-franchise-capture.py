from pathlib import Path
root=Path(__file__).resolve().parents[1]
s=(root/'game-runtime/Native/main.swift').read_text()
a=s.index('    var sample=Franchise.make');b=s.index('    var index=0',a)
preamble='\n'.join(line for line in s[a:b].splitlines() if 'let names=' not in line)
a=s.index('        view.profilePerformance=false',b);b=s.index('        view.needsDisplay=true',a)
cases=s[a:b]
result='''// Generated reference scenes from the native release capture harness.
import Foundation
#if PORT_TEST
func referenceCapture(_ view:FranchiseView,_ index:Int){
    let db=view.db
'''+preamble+'\n'+cases+'''
    view.photoOffset=0;view.clock=0
}
#endif
'''
(root/'game-runtime/Adapter/Capture.swift').write_text(result)
