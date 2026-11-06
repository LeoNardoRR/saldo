import test from 'node:test';
import assert from 'node:assert/strict';
import {pages} from './views.js';
import {pageAliases,mobileNavigation,resolveNavigationPage,activeMobileDestination,bindNavigationViewport} from './navigation.js';

test('navigation covers actual pages and preserves legacy deep links',()=>{
  assert.deepEqual([...new Set(Object.values(pageAliases))].sort(),Object.keys(pages).sort());
  for(const page of Object.keys(pages)){
    assert.equal(resolveNavigationPage(`#${page}`),page);
    assert.equal(activeMobileDestination(page),['planning','recurring','settings'].includes(page)?'more':page);
  }
  assert.equal(resolveNavigationPage('#accounts-section'),'accounts');
  for(const hash of ['', '#unknown', '#constructor', '#toString'])assert.equal(resolveNavigationPage(hash),'overview');
});

test('creation and overflow remain actions, links are real SPA destinations',()=>{
  assert.equal(mobileNavigation.length,5);
  assert.deepEqual(mobileNavigation.filter(x=>x.action).map(x=>x.action),['quick','more']);
  for(const item of mobileNavigation.filter(x=>x.page))assert.ok(pages[item.page]);
  assert.equal(mobileNavigation.find(x=>x.key==='quick').page,undefined);
});

function viewportFixture(){
  const win=new EventTarget();win.innerHeight=852;
  win.visualViewport=new EventTarget();Object.assign(win.visualViewport,{height:852,scale:1});
  const doc=new EventTarget();doc.activeElement={matches:()=>false};
  const attrs=new Set();const el={inert:false,toggleAttribute:(name,value)=>value?attrs.add(name):attrs.delete(name),removeAttribute:name=>attrs.delete(name)};
  return {win,doc,el,attrs};
}
test('keyboard hides nav only with editable focus and a shrunken visual viewport; cleanup removes listeners',()=>{
  const {win,doc,el,attrs}=viewportFixture();const cleanup=bindNavigationViewport(el,{win,doc});
  doc.activeElement={matches:()=>true};doc.dispatchEvent(new Event('focusin'));
  assert.equal(el.inert,false,'hardware keyboard must keep navigation visible');
  win.visualViewport.height=480;win.visualViewport.dispatchEvent(new Event('resize'));
  assert.equal(el.inert,true);assert.ok(attrs.has('data-keyboard-open'));
  win.visualViewport.scale=2;win.visualViewport.dispatchEvent(new Event('resize'));
  assert.equal(el.inert,false,'pinch zoom is not a keyboard');
  win.visualViewport.scale=1;doc.activeElement={matches:()=>false};doc.dispatchEvent(new Event('focusout'));
  assert.equal(el.inert,false,'browser chrome resizing alone must not hide navigation');
  cleanup();doc.activeElement={matches:()=>true};win.visualViewport.dispatchEvent(new Event('resize'));
  assert.equal(el.inert,false);assert.equal(attrs.size,0);
});
test('navigation works without VisualViewport support',()=>{
  const {win,doc,el}=viewportFixture();delete win.visualViewport;
  const cleanup=bindNavigationViewport(el,{win,doc});
  doc.activeElement={matches:()=>true};doc.dispatchEvent(new Event('focusin'));
  assert.equal(el.inert,false);cleanup();
});
