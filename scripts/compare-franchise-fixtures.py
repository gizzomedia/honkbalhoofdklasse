"""Compare raw JSON in Python so UInt64 values retain their integer precision."""
import json,sys
from pathlib import Path
reference=Path(sys.argv[1]);actual=Path(sys.argv[2])
def diff(a,b,p=''):
 if isinstance(a,(float,int)) and not isinstance(a,bool) and isinstance(b,(float,int)) and not isinstance(b,bool):
  if isinstance(a,int) and isinstance(b,int):return None if a==b else (p,a,b)
  return None if abs(a-b)<1e-9 else (p,a,b)
 if type(a)!=type(b):return (p,type(a).__name__,type(b).__name__)
 if isinstance(a,dict):
  if a.keys()!=b.keys():return(p,'keys',a.keys()^b.keys())
  for k in a:
   d=diff(a[k],b[k],p+'/'+k)
   if d:return d
 elif isinstance(a,list):
  if len(a)!=len(b):return(p,len(a),len(b))
  for i,(x,y) in enumerate(zip(a,b)):
   d=diff(x,y,p+'/'+str(i))
   if d:return d
 elif a!=b:return(p,a,b)
errors=0
for f in sorted(reference.glob('*.json')):
 d=diff(json.loads(f.read_text()),json.loads((actual/f.name).read_text()))
 print(f.stem, d or 'PASS');errors+=bool(d)
sys.exit(bool(errors))
