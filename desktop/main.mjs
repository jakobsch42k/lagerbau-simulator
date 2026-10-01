// Electron-Hauptprozess des Windows-Programms (Spec D5): ein gehärtetes Fenster, das die gebaute App von der Platte lädt.
import { app, BrowserWindow, Menu, dialog } from 'electron';
import { join } from 'node:path';

const TITEL = 'Lagerbau-Simulator';

class Hauptfenster {
  /** Öffnet das Fenster und lädt dist-desktop/index.html. Fehlt die Datei, erscheint ein Fehlerdialog statt eines weißen Fensters. */
  static oeffne() {
    const fenster = new BrowserWindow({
      width: 1280,
      height: 800,
      minWidth: 1024, // nie unter 768 px → die App öffnet immer im Editor-Modus
      minHeight: 700,
      title: TITEL,
      icon: join(app.getAppPath(), 'build', 'icon.png'),
      webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false },
    });
    Hauptfenster.sperreNavigation(fenster);
    const index = join(app.getAppPath(), 'dist-desktop', 'index.html');
    fenster.loadFile(index).catch((fehler) => {
      dialog.showErrorBox(TITEL, `Die Programmdateien fehlen oder sind beschädigt.\n${index}\n${fehler.message}`);
      app.quit();
    });
    return fenster;
  }

  /** Ohne Adresszeile und Zurück-Knopf gäbe es keinen Weg zurück: Navigation und neue Fenster sind gesperrt. */
  static sperreNavigation(fenster) {
    fenster.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    fenster.webContents.on('will-navigate', (ereignis) => ereignis.preventDefault());
  }
}

Menu.setApplicationMenu(null);
app.whenReady().then(() => Hauptfenster.oeffne());
app.on('window-all-closed', () => app.quit());
