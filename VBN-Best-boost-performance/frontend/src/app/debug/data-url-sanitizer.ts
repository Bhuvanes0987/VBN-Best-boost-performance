// Dev + runtime sanitizer for malformed or oversized data: URLs
// - strips trailing ":<digits>" artifacts
// - converts very large base64 data: URLs into Blob/ObjectURLs to avoid invalid URL/network errors
// Safe to import in production as it performs minimal checks.
(function(){
  function isDataUrl(s: any){
    return typeof s === 'string' && s.trim().startsWith('data:');
  }

  function stripTrailingSuffix(url: string){
    // remove trailing :<digits> or whitespace
    return url.replace(/\s+$/,'').replace(/:~?\d+$/,'').replace(/:1$/,'');
  }

  function base64ToBlob(base64: string, contentType: string){
    try{
      const bin = atob(base64);
      const len = bin.length;
      const arr = new Uint8Array(len);
      for(let i=0;i<len;i++) arr[i]=bin.charCodeAt(i);
      return new Blob([arr], { type: contentType || 'application/octet-stream' });
    }catch(e){
      return null;
    }
  }

  function sanitizeDataUrlMaybe(value: string, el?: Element){
    if(!isDataUrl(value)) return value;
    let v = value.trim();
    v = stripTrailingSuffix(v);

    // extract header and payload
    const idx = v.indexOf(',');
    if(idx === -1) return v;
    const header = v.substring(0, idx);
    const payload = v.substring(idx+1);

    // if not base64, just return cleaned URL
    if(!/;base64$/i.test(header.split(';').slice(-1)[0]) && !/base64/i.test(header)){
      return v;
    }

    // If payload is extremely long, convert to Blob/ObjectURL to avoid browser URL length issues
    const MAX_BASE64_LENGTH = 200000; // ~150KB image threshold
    if(payload.length > MAX_BASE64_LENGTH){
      const mimeMatch = header.match(/^data:([^;]+);/i);
      const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
      const blob = base64ToBlob(payload, mime);
      if(blob){
        const objUrl = URL.createObjectURL(blob);
        // revoke after element loads (if available)
        if(el instanceof HTMLImageElement){
          el.addEventListener('load', function(){ try{ URL.revokeObjectURL(objUrl);}catch(e){} }, { once: true });
        }
        return objUrl;
      }
    }

    // final fallback: return stripped data URL
    return v;
  }

  try{
    // override HTMLImageElement.setAttribute for 'src'
    const origImgSetAttr = HTMLImageElement.prototype.setAttribute;
    HTMLImageElement.prototype.setAttribute = function(this: HTMLImageElement, name: string, value: any){
      if(name === 'src' && typeof value === 'string'){
        try{ value = sanitizeDataUrlMaybe(value, this as Element); }catch(e){}
      }
      return origImgSetAttr.call(this, name, value);
    };

    // override src property setter
    const imgDesc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
    if(imgDesc && imgDesc.set){
      Object.defineProperty(HTMLImageElement.prototype, 'src', {
        set: function(this: HTMLImageElement, val: any){
          try{ val = sanitizeDataUrlMaybe(val, this as Element); }catch(e){}
          return imgDesc.set!.call(this, val);
        },
        get: imgDesc.get,
        configurable: true,
        enumerable: true
      });
    }

    // override generic Element.setAttribute for inline style background-image cases
    const origSetAttr = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function(this: Element, name: string, value: any){
      if(name === 'style' && typeof value === 'string'){
        // attempt to sanitize any url(data:...) occurrences
        const elRef = this as Element;
        value = value.replace(/url\(([^)]+)\)/gi, (_m: string, u: string) => {
          let inner = (u||'').trim().replace(/^['"]|['"]$/g,'');
          if(isDataUrl(inner)){
            try{ return 'url(' + sanitizeDataUrlMaybe(inner, elRef) + ')'; }catch(e){ return 'url(' + inner + ')'; }
          }
          return 'url(' + inner + ')';
        });
      }
      return origSetAttr.call(this, name, value);
    };

    // override CSSStyleDeclaration.setProperty for background-image
    const cssSetProp = CSSStyleDeclaration.prototype.setProperty as any;
    if(cssSetProp){
      CSSStyleDeclaration.prototype.setProperty = function(this: CSSStyleDeclaration, name: string, value: string, priority?: string){
        if(name === 'background-image' && typeof value === 'string'){
          value = value.replace(/url\(([^)]+)\)/gi, (_m: string, u: string) => {
            let inner = (u||'').trim().replace(/^['"]|['"]$/g,'');
            if(isDataUrl(inner)){
              try{ return 'url(' + sanitizeDataUrlMaybe(inner) + ')'; }catch(e){ return 'url(' + inner + ')'; }
            }
            return 'url(' + inner + ')';
          });
        }
        return cssSetProp.call(this, name, value, priority);
      };
    }
  }catch(e){
    // fail silently
    console.warn('data-url-sanitizer init error', e);
  }

})();

// ensure this file is treated as a module by TypeScript
export {};
