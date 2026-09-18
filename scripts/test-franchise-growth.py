from pathlib import Path
import subprocess
root=Path(__file__).resolve().parents[1];work=root/'game-runtime/.test-native/growth';work.mkdir(parents=True,exist_ok=True)
(work/'main.swift').write_text((root/'game-runtime/Tests/franchise-growth.swift.txt').read_text())
files=list((root/'game-runtime/Generated').glob('*.swift'))+[root/'game-runtime/Adapter/Platform.swift',work/'main.swift']
subprocess.run(['swiftc','-O','-module-cache-path',str(work/'cache'),*map(str,files),'-o',str(work/'run')],check=True)
subprocess.run([str(work/'run'),str(root/'public/franchise'),str(root/'game-runtime/Tests/Fixtures/legacy-0.3.json'),str(work/'counter.json')],check=True)
