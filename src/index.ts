import App from './App.vue';
import { Plugin, Menu, Setting, getFrontend } from 'siyuan';
import { app, i18n, isMobile, eventBus, position, confirmBeforeCreate } from './hooks/useSiYuan';
import SySelect from './lib/SySelect.vue';
import SyNotebookSelect from './lib/SyNotebookSelect.vue';
import SyConfirmSwitch from './lib/SyConfirmSwitch.vue';
import './index.less';

const STORAGE_NAME = 'arco-calendar-entry';

export default class ArcoCalendarPlugin extends Plugin {
  private topEle!: HTMLElement;
  private menuEle!: HTMLElement;

  onload() {
    i18n.value = this.i18n;
    app.value = this.app;
    eventBus.value = this.eventBus;
    isMobile.value = ['mobile', 'browser-mobile'].includes(getFrontend());
    this.init();
  }

  onunload() {
    this.topEle?.remove();
    this.menuEle?.remove();
  }

  private async init() {
    const data = await this.loadData(STORAGE_NAME);
    if (!data) {
      await this.saveData(STORAGE_NAME, { position: 'top-left', confirmBeforeCreate: false });
      await this.loadData(STORAGE_NAME);
      position.value = 'top-left';
      confirmBeforeCreate.value = false;
    } else {
      position.value = data.position;
      confirmBeforeCreate.value = !!data.confirmBeforeCreate;
    }
    if (position.value === 'top-left') {
      this.addTopItem('left');
    } else if (position.value === 'top-right') {
      this.addTopItem('right');
    } else if (position.value === 'dock') {
      this.addDockItem();
    }
    this.initSetting();
  }

  private initSetting() {
    this.setting = new Setting({
      height: 'auto',
      width: '500px',
      confirmCallback: async () => {
        const saved = await this.loadData(STORAGE_NAME);
        const positionChanged = saved?.position !== position.value;
        await this.saveData(STORAGE_NAME, { position: position.value, confirmBeforeCreate: confirmBeforeCreate.value });
        if (positionChanged) window.location.reload();
      },
    });
    const selectEle = document.createElement('div');
    createApp(SySelect).mount(selectEle);
    this.setting.addItem({
      title: i18n.value.position.title,
      actionElement: selectEle,
    });

    const notebookEle = document.createElement('div');
    createApp(SyNotebookSelect).mount(notebookEle);
    this.setting.addItem({
      title: i18n.value.settings?.dailyDestination?.title || 'Daily note destination',
      actionElement: notebookEle,
    });

    const confirmEle = document.createElement('div');
    createApp(SyConfirmSwitch).mount(confirmEle);
    this.setting.addItem({
      title: i18n.value.settings?.confirmBeforeCreate?.title || 'Confirm before creating new note',
      actionElement: confirmEle,
    });
  }

  private addTopItem(direction: 'left' | 'right') {
    this.topEle = this.addTopBar({
      icon: 'iconCalendar',
      title: this.i18n.openCalendar,
      position: direction,
      callback: () => {
        let rect = this.topEle.getBoundingClientRect();
        // 如果被隐藏，则使用更多按钮
        if (rect.width === 0) {
          rect = document.querySelector('#barMore')!.getBoundingClientRect();
        }
        const menu = new Menu('Calendar');
        menu.addItem({ element: this.menuEle });
        if (isMobile.value) {
          menu.fullscreen();
        } else {
          menu.open({
            x: rect[direction],
            y: rect.bottom,
            isLeft: direction !== 'left',
          });
        }
      },
    });
    this.menuEle = document.createElement('div');
    createApp(App).mount(this.menuEle);
  }

  private addDockItem() {
    const _plugin = this;
    this.addDock({
      config: {
        position: 'RightTop',
        size: { width: 300, height: 0 },
        icon: 'iconCalendar',
        title: _plugin.i18n.tabName,
      },
      data: {},
      type: 'dock_tab',
      init: dock => {
        createApp(App).mount(dock.element);
      },
    });
  }
}
