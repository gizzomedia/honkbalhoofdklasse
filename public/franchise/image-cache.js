import {photos} from './photo-assets.js';

// Keep only a small working set of decoded photos, rather than all 72 originals.
export class ImageCache {
  constructor(onChange,onError,maxPhotos=24){
    this.images=new Map();this.photoKeys=new Set();this.ready=new WeakSet();
    this.lastBySlot=new Map();this.used=new Set();this.maxPhotos=maxPhotos;
    this.onChange=onChange;this.onError=onError;
  }
  begin(frame){
    this.used.clear();
    const slots=new Set((frame.commands||[]).filter(c=>c[0]==='image'&&photos[c[1]]).map(c=>c.slice(2,6).join(':')));
    for(const slot of this.lastBySlot.keys())if(!slots.has(slot))this.lastBySlot.delete(slot);
  }
  load(path,variant='full',priority='high'){
    const asset=photos[path],key=asset?.[variant]||'/franchise/'+path;
    this.used.add(key);
    if(this.images.has(key)){
      const image=this.images.get(key);this.images.delete(key);this.images.set(key,image);
      if(priority==='high')image.fetchPriority='high';
      return {image,key};
    }
    const image=new Image();image.decoding='async';image.fetchPriority=priority;
    this.images.set(key,image);if(asset)this.photoKeys.add(key);
    image.onload=async()=>{
      try{await image.decode();}catch{return;}
      if(this.images.get(key)!==image)return;
      this.ready.add(image);this.onChange();
    };
    let fallback=false;
    image.onerror=()=>{
      if(asset&&!fallback){fallback=true;image.src='/franchise/'+path;return;}
      this.onError(path);
    };
    image.src=key;return {image,key};
  }
  get(path,rect,cy,page){
    const asset=photos[path],variant=rect[2]<=500&&rect[3]<=500?'card':'full';
    const current=this.load(path,variant),slot=rect.join(':');
    if(this.ready.has(current.image)){
      if(asset){
        this.lastBySlot.set(slot,{...current,cy});
        // Club photos and team cards advance one photograph at a time.
        // The front-page hero changes clubs too, so do not guess its next image.
        if(variant==='card'||page==='hub'||page==='draft')this.load(asset.next,variant,'low');
      }
      return {...current,cy};
    }
    const previous=asset&&this.lastBySlot.get(slot);
    if(previous){this.used.add(previous.key);return previous;}
    return null;
  }
  end(){
    if(this.photoKeys.size<=this.maxPhotos)return;
    for(const [key,image]of this.images){
      if(!this.photoKeys.has(key)||this.used.has(key))continue;
      image.onload=null;image.onerror=null;image.removeAttribute('src');
      this.images.delete(key);this.photoKeys.delete(key);
      if(this.photoKeys.size<=this.maxPhotos)break;
    }
  }
}
