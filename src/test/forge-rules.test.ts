import { describe, expect, it } from 'vitest';
import { ADMIN_LOGIN_LIMIT, ADMIN_LOGIN_WINDOW_MINUTES, ADMIN_SESSION_SECONDS, PROVIDERS } from '../lib/admin-policy';
import { newProject, getLayers, withTemplate, withCanvas } from '../lib/project';
import { TEMPLATES } from '../lib/templates';
import { isDrawable, resolveText } from '../lib/renderer';
import { emptyMeta } from '../lib/types';
describe('Admin rules', () => {
  it('expires admin sessions after one hour', () => expect(ADMIN_SESSION_SECONDS).toBe(3600));
  it('allows at most five attempts per window', () => expect(ADMIN_LOGIN_LIMIT).toBe(5));
  it('uses a fifteen minute attempt window', () => expect(ADMIN_LOGIN_WINDOW_MINUTES).toBe(15));
  it('never requires keys for public anime providers', () => { expect(PROVIDERS.find(p=>p.id==='anilist')?.secret).toBe(''); expect(PROVIDERS.find(p=>p.id==='jikan')?.secret).toBe(''); });
  it('keeps optional IMDb-related provider disabled by default', () => expect(PROVIDERS.find(p=>p.id==='omdb')?.defaultEnabled).toBe(false));
});
describe('Poster rules', () => {
  it('preserves both original templates and adds two independent variants', () => expect(TEMPLATES.map(t=>t.id)).toEqual(['classic','reference-cinematic','split','reference-split']));
  for(const template of TEMPLATES) for(const canvas of [{w:1920,h:1080},{w:1080,h:1920}]) {
    it(`${template.id} has circular top-right logo on ${canvas.w} canvas`, () => {
      const layers=template.build(canvas), logo=layers.find(l=>l.role==='logo');
      expect(logo).toBeDefined();
      expect((logo?.w??0)*canvas.w).toBeCloseTo((logo?.h??1)*canvas.h);
      expect(logo?.x).toBeGreaterThan(0.8); expect(logo?.y).toBeLessThan(0.08);
    });
  }
  it('switching templates retains artwork, metadata, palette and custom layers', () => {
    const p=newProject(); p.image='artwork'; p.meta.title='தமிழ் 日本語';
    p.layersByTemplate['classic']?.push({ ...getLayers(p)[0], id:'custom',name:'Custom',x:0.123 } as typeof p.layersByTemplate[string][number]);
    const next=withTemplate(withTemplate(p,'reference-split'),'classic');
    expect(next.image).toBe('artwork'); expect(next.meta.title).toBe('தமிழ் 日本語'); expect(next.palette).toEqual(p.palette);
    expect(getLayers(next).find(l=>l.id==='custom')?.x).toBe(0.123);
  });
  it('changing canvas does not discard other template edits', () => {
    const p=withTemplate(newProject(),'reference-split');
    const previous=p.layersByTemplate['classic'];
    expect(withCanvas(p,1920,1080).layersByTemplate['classic']).toEqual(previous);
  });
  it('legacy projects gain logo without altering existing layout', () => {
    const p=newProject(); p.layersByTemplate['classic']=getLayers(p).filter(l=>l.role!=='logo');
    const before=structuredClone(p.layersByTemplate['classic']);
    expect(getLayers(p).filter(l=>l.role!=='logo')).toEqual(before);
    expect(getLayers(p).some(l=>l.role==='logo')).toBe(true);
  });
  it('missing metadata does not render rating placeholders', () => {
    const meta=emptyMeta();
    expect(resolveText('★ {rating}',meta)).toBeNull();
    const rating=TEMPLATES[1]?.build({w:1920,h:1080}).find(l=>l.name==='Rating and source');
    expect(rating && isDrawable(rating,meta)).toBe(false);
  });
});