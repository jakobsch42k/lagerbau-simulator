import { describe, expect, it } from 'vitest';
import { LinkBasis } from './LinkBasis';

describe('LinkBasis', () => {
  it('nimmt im Windows-Programm (file:) die Adresse der Web-Version', () => {
    const ort = { protocol: 'file:', origin: 'null', pathname: '/C:/Users/x/AppData/Local/Temp/app/dist-desktop/index.html' };
    expect(LinkBasis.aus(ort)).toBe('https://jakobsch42k.github.io/lagerbau-simulator/');
  });

  it('nimmt im Browser origin + pathname der aktuellen Adresse', () => {
    expect(LinkBasis.aus({ protocol: 'https:', origin: 'https://jakobsch42k.github.io', pathname: '/lagerbau-simulator/' })).toBe(
      'https://jakobsch42k.github.io/lagerbau-simulator/',
    );
    expect(LinkBasis.aus({ protocol: 'http:', origin: 'http://localhost:5173', pathname: '/lagerbau-simulator/' })).toBe(
      'http://localhost:5173/lagerbau-simulator/',
    );
  });

  it('nennt beim Kopierfehler die Adresszeile nur im Browser', () => {
    expect(LinkBasis.kopierFehlerText({ protocol: 'file:', origin: 'null', pathname: '/x/index.html' })).toBe('Kopieren nicht möglich.');
    expect(LinkBasis.kopierFehlerText({ protocol: 'https:', origin: 'https://jakobsch42k.github.io', pathname: '/lagerbau-simulator/' })).toBe(
      'Kopieren nicht möglich. Der Link steht in der Adresszeile.',
    );
  });
});
