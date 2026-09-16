// Canvas adapter for the unmodified Swift screen bodies (1600 x 900).
export class Renderer {
  constructor(canvas, controls, send) { this.canvas=canvas; this.ctx=canvas.getContext('2d'); this.controls=controls; this.send=send; this.images=new Map(); this.frame=null; this.areaKey=''; }
  async fonts() {
    for(const [name,file] of Object.entries({ExtraBoldIt:'ExtraBold_It',ExtraBold:'ExtraBold',ExtraLight:'ExtraLight',Regular:'Regular'})) {
      const font=new FontFace('HK'+name,`url(/franchise/Assets/Fonts/RevolutionGothic_${file}.otf)`);
      await font.load(); document.fonts.add(font);
    }
  }
  image(path) {
    if(!this.images.has(path)) { const im=new Image(); im.onload=()=>this.frame&&this.paint(this.frame); im.onerror=()=>{document.dispatchEvent(new CustomEvent('asseterror',{detail:path}));}; im.src='/franchise/'+path; this.images.set(path,im); }
    return this.images.get(path);
  }
  resize() { const dpr=Math.min(window.devicePixelRatio||1,2); const box=this.canvas.getBoundingClientRect(); this.canvas.width=Math.round(box.width*dpr);this.canvas.height=Math.round(box.height*dpr); if(this.frame)this.paint(this.frame); }
  text(cmd) {
    const [,s,x,y,size,color,font,width,height,spacing]=cmd,c=this.ctx;
    c.save();c.beginPath();c.rect(x,y,width,height||size*1.55);c.clip();c.font=`${size}px HK${font}`;c.fillStyle=color;c.textBaseline='alphabetic';
    // AppKit NSString.draw starts at the font's line-fragment top. Font bounding
    // box ascent preserves that top rather than browser textBaseline=top's em box.
    const m=c.measureText('Hg'); const ascent=m.fontBoundingBoxAscent ?? size*.85;
    const descent=m.fontBoundingBoxDescent ?? size*.2;
    if(!height) {let t=s;if(c.measureText(t).width>width){while(t.length&&c.measureText(t+'…').width>width)t=t.slice(0,-1);t+='…';}c.fillText(t,x,y+ascent);}
    else {let yy=y+ascent;const lh=ascent+descent+spacing;
      for(const para of s.split('\n')) {let line='';for(const word of para.split(' ')){const test=line ? line+' '+word:word;if(line&&c.measureText(test).width>width){c.fillText(line,x,yy);yy+=lh;line=word;}else line=test;}c.fillText(line,x,yy);yy+=lh;}
    }c.restore();
  }
  paint(frame) {
    this.frame=frame;const c=this.ctx;c.setTransform(this.canvas.width/1600,0,0,this.canvas.height/900,0,0);c.clearRect(0,0,1600,900);
    for(const cmd of frame.commands||[]) {
      const [op,...a]=cmd;
      if(op==='fill'){c.fillStyle=a[4];c.fillRect(...a.slice(0,4));}
      else if(op==='text')this.text(cmd);
      else if(op==='image'){const [path,x,y,w,h,alpha,cover,cy]=a,im=this.image(path);if(!im.complete||!im.naturalWidth)continue;
        const scale=cover?Math.max(w/im.naturalWidth,h/im.naturalHeight):Math.min(w/im.naturalWidth,h/im.naturalHeight),iw=im.naturalWidth*scale,ih=im.naturalHeight*scale;
        c.save();c.beginPath();c.rect(x,y,w,h);c.clip();c.globalAlpha=alpha;c.drawImage(im,x+w/2-iw/2,y-(ih-h)*cy,iw,ih);c.restore();
      }else if(op==='gradient'){const[x,y,w,h,from,to,angle]=a;const g=c.createLinearGradient(x,y,angle===0?x+w:x,angle===0?y:y+h);g.addColorStop(0,from);g.addColorStop(1,to);c.fillStyle=g;c.fillRect(x,y,w,h);}
      else if(op==='path'){const [parts,color,lw,fill]=a;c.beginPath();for(const [shape,...v]of parts){if(shape==='rect')c.rect(...v);else if(shape==='round')c.roundRect(...v.slice(0,4),Math.min(v[4],v[2]/2,v[3]/2));else if(shape==='ellipse')c.ellipse(v[0]+v[2]/2,v[1]+v[3]/2,v[2]/2,v[3]/2,0,0,Math.PI*2);else if(shape==='move')c.moveTo(...v);else if(shape==='line')c.lineTo(...v);else if(shape==='close')c.closePath();}if(fill){c.fillStyle=color;c.fill();}else{c.strokeStyle=color;c.lineWidth=lw;c.stroke();}}
    }
    const key=JSON.stringify(frame.areas);if(key!==this.areaKey){this.areaKey=key;this.controls.replaceChildren();(frame.areas||[]).forEach((a,i)=>{const b=document.createElement('button');b.type='button';b.textContent=a.label;b.setAttribute('aria-label',a.label);b.dataset.action=a.action;const [x,y,w,h]=a.rect;Object.assign(b.style,{left:x/16+'%',top:y/9+'%',width:w/16+'%',height:h/9+'%'});b.onclick=()=>this.send({op:'action',action:a.action});b.onfocus=()=>this.send({op:'focus',index:i});this.controls.append(b);});}
    document.getElementById('announcer').textContent=frame.toast||'';
  }
}
