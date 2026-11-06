// Adapted from Opaline GlassTabBar/GlassTabBarItem (MIT, Deepraj Bera).
// Material layers adapted from LiquidGlassBottomNav (MIT, Okazawa).
// Pinned sources and full notices: licenses/opaline.txt, licenses/liquid-glass-nav.txt.
import React, {useRef, useState} from 'react';
import {motion, useReducedMotion} from 'motion/react';
import {House, List, Plus, Wallet, Ellipsis} from 'lucide-react';
import {mobileNavigation, activeMobileDestination} from '../../navigation.js';
import {useActiveIndicator} from './vendor/use-active-indicator';
import './floating-liquid-glass-nav.css';

const icons={home:House,list:List,plus:Plus,wallet:Wallet,more:Ellipsis};

/** The enclosing nav is kept in the HTML shell; this island persists across
 * financial page renders. The route, never a click-local state, selects the lens.
 */
export function FloatingLiquidGlassNav({page}:{page:string}){
  const ref=useRef<HTMLDivElement>(null);
  const rect=useActiveIndicator(ref,'[aria-current="page"]');
  const reduced=useReducedMotion();
  const [pressed,setPressed]=useState<string|null>(null);
  const active=activeMobileDestination(page);
  return <>
    <div className="liquid-nav__effect" aria-hidden="true"/>
    <div className="liquid-nav__tint" aria-hidden="true"/>
    <div className="liquid-nav__shine" aria-hidden="true"/>
    <div ref={ref} className="liquid-nav__content" data-slot="glass-tab-bar"
      onPointerDown={event=>setPressed((event.target as Element).closest<HTMLElement>('[data-nav-key]')?.dataset.navKey??null)}
      onPointerUp={()=>setPressed(null)} onPointerCancel={()=>setPressed(null)} onPointerLeave={()=>setPressed(null)}>
      {rect&&<motion.div aria-hidden="true" className="liquid-nav__indicator"
        initial={false} animate={{x:rect.left,width:rect.width,height:rect.height,y:rect.top}}
        transition={reduced?{duration:0}:{type:'spring',stiffness:420,damping:34,mass:.8}}>
        <motion.div className="liquid-nav__lens" initial={false}
          animate={{scaleX:!reduced&&pressed===active?1.045:1,scaleY:!reduced&&pressed===active?.94:1}}
          transition={reduced?{duration:0}:{type:'spring',stiffness:400,damping:24}}/>
      </motion.div>}
      {mobileNavigation.map(item=>{
        const Icon=icons[item.icon as keyof typeof icons];
        const selected=active===item.key;
        const content=<><Icon size={24} strokeWidth={selected?2.3:1.8} aria-hidden="true"/><span className="liquid-nav__label">{item.label}</span></>;
        const props={className:`liquid-nav__item${item.key==='quick'?' liquid-nav__create':''}`,
          'data-nav-key':item.key,'data-slot':'glass-tab-bar-item',
          'aria-current':selected?'page' as const:undefined,
          'data-pressed':pressed===item.key?'true':undefined};
        return item.page?<a key={item.key} href={`#${item.page}`} data-page={item.page} {...props}>{content}</a>:
          <button key={item.key} type="button" data-action={item.action} aria-label={item.label}
            aria-haspopup="dialog" {...props}>{content}</button>;
      })}
    </div>
  </>;
}
