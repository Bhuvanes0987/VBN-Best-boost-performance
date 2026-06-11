/**
 * Dev helper: watches for assignments of `data:` URLs to img.src, setAttribute('src'),
 * and inline styles. Logs a console.warn and stack trace so you can see the initiator.
 * Import this only in development (it runs safely in modern browsers).
 */
export function installDataUrlWatcher() {
  try {
    const isData = (v: any) => typeof v === 'string' && v.startsWith('data:');

    // Patch HTMLImageElement.src setter
    const imgDesc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
    if (imgDesc && typeof imgDesc.set === 'function') {
      Object.defineProperty(HTMLImageElement.prototype, 'src', {
        get: function () {
          return imgDesc.get!.call(this);
        },
        set: function (val: any) {
          if (isData(val)) {
            try { console.warn('data URL assigned to img.src:', String(val).slice(0,200)); } catch(e){}
            console.trace();
          }
          return imgDesc.set!.call(this, val);
        }
      });
    }

    // Patch Element.setAttribute to catch data: assigned via attributes
    const origSetAttr = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function (name: string, value: any) {
      try {
        if ((name === 'src' || name === 'href') && isData(value)) {
          console.warn('data URL setAttribute on', this, name, String(value).slice(0,200));
          console.trace();
        }
        if (name === 'style' && typeof value === 'string' && value.includes('data:')) {
          console.warn('style contains data URL on', this, String(value).slice(0,200));
          console.trace();
        }
      } catch (e) {}
      return origSetAttr.call(this, name, value);
    };

    // Patch CSSStyleDeclaration.setProperty for inline setting of background-image
    const styleProto: any = (CSSStyleDeclaration as any).prototype;
    if (styleProto && typeof styleProto.setProperty === 'function') {
      const origSetProp = styleProto.setProperty;
      styleProto.setProperty = function (prop: string, value: string, priority?: string) {
        try {
          if (typeof value === 'string' && value.includes('data:')) {
            console.warn('style.setProperty contains data URL', prop, String(value).slice(0,200));
            console.trace();
          }
        } catch (e) {}
        return origSetProp.call(this, prop, value, priority);
      };
    }

    console.info('Data URL watcher installed');
  } catch (err) {
    // safe fail
    console.error('Failed to install data URL watcher', err);
  }
}

// Auto-install when imported
installDataUrlWatcher();
