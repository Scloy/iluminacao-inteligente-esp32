/**
 * macOS Window Manager
 * Gerencia janelas flutuantes arrastáveis (drag-and-drop), recolhíveis (collapse / minimize),
 * fechamento, foco (z-index) e integração com o macOS Dock e Menu Bar.
 */

class MacOSWindowManager {
  constructor() {
    this.windows = new Map();
    this.highestZIndex = 100;
    this.activeDragWindow = null;
    this.dragOffset = { x: 0, y: 0 };

    this.init();
  }

  init() {
    document.querySelectorAll('.macos-window').forEach(win => {
      this.registerWindow(win);
    });

    // Eventos globais de arrasto
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('mouseup', () => this.onMouseUp());

    // Suporte a touch em dispositivos móveis
    window.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1) {
        this.onMouseMove(e.touches[0]);
      }
    }, { passive: false });
    window.addEventListener('touchend', () => this.onMouseUp());
  }

  registerWindow(winElement) {
    const id = winElement.id;
    const titleBar = winElement.querySelector('.macos-titlebar');
    const btnClose = winElement.querySelector('.traffic-btn.close');
    const btnMin = winElement.querySelector('.traffic-btn.minimize');
    const btnMax = winElement.querySelector('.traffic-btn.maximize');

    const winState = {
      element: winElement,
      isCollapsed: false,
      isOpen: true,
      prevTop: winElement.style.top,
      prevLeft: winElement.style.left
    };

    this.windows.set(id, winState);

    // Clique na janela traz para a frente (foco)
    winElement.addEventListener('mousedown', () => {
      this.bringToFront(winElement);
    });

    // Arrasto pela barra de título
    if (titleBar) {
      titleBar.addEventListener('mousedown', (e) => {
        if (e.target.closest('.traffic-lights')) return; // Não arrasta se clicou nos botões
        this.startDrag(winElement, e);
      });

      titleBar.addEventListener('touchstart', (e) => {
        if (e.target.closest('.traffic-lights')) return;
        if (e.touches.length === 1) {
          this.startDrag(winElement, e.touches[0]);
        }
      }, { passive: true });

      // Duplo clique na barra de título recolhe/expande (comportamento nativo do macOS)
      titleBar.addEventListener('dblclick', (e) => {
        if (e.target.closest('.traffic-lights')) return;
        this.toggleCollapse(id);
      });
    }

    // Botão Vermelho (Fechar / Ocultar)
    if (btnClose) {
      btnClose.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeWindow(id);
      });
    }

    // Botão Amarelo (Recolher / Expandir)
    if (btnMin) {
      btnMin.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleCollapse(id);
      });
    }

    // Botão Verde (Maximizar / Restaurar)
    if (btnMax) {
      btnMax.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleMaximize(id);
      });
    }
  }

  startDrag(winElement, e) {
    this.activeDragWindow = winElement;
    this.bringToFront(winElement);

    const rect = winElement.getBoundingClientRect();
    this.dragOffset.x = e.clientX - rect.left;
    this.dragOffset.y = e.clientY - rect.top;

    winElement.classList.add('is-dragging');
    document.body.style.userSelect = 'none';
  }

  onMouseMove(e) {
    if (!this.activeDragWindow) return;

    const win = this.activeDragWindow;
    let newX = e.clientX - this.dragOffset.x;
    let newY = e.clientY - this.dragOffset.y;

    // Limites da tela para não perder a janela
    const minTop = 36; // abaixo da menu bar
    const maxTop = window.innerHeight - 50;
    const minLeft = -win.offsetWidth + 80;
    const maxLeft = window.innerWidth - 80;

    newY = Math.max(minTop, Math.min(newY, maxTop));
    newX = Math.max(minLeft, Math.min(newX, maxLeft));

    win.style.left = `${newX}px`;
    win.style.top = `${newY}px`;
    win.style.right = 'auto';
    win.style.bottom = 'auto';
  }

  onMouseUp() {
    if (this.activeDragWindow) {
      this.activeDragWindow.classList.remove('is-dragging');
      this.activeDragWindow = null;
      document.body.style.userSelect = '';
    }
  }

  bringToFront(winElement) {
    this.highestZIndex += 1;
    winElement.style.zIndex = this.highestZIndex;
  }

  toggleCollapse(id) {
    const winState = this.windows.get(id);
    if (!winState) return;

    winState.isCollapsed = !winState.isCollapsed;
    winState.element.classList.toggle('collapsed', winState.isCollapsed);
  }

  closeWindow(id) {
    const winState = this.windows.get(id);
    if (!winState) return;

    winState.isOpen = false;
    winState.element.classList.add('hidden');
    this.updateDockDot(id, false);
  }

  openWindow(id) {
    const winState = this.windows.get(id);
    if (!winState) return;

    winState.isOpen = true;
    winState.element.classList.remove('hidden');
    this.bringToFront(winState.element);
    this.updateDockDot(id, true);
  }

  toggleWindow(id) {
    const winState = this.windows.get(id);
    if (!winState) return;

    if (winState.isOpen && !winState.element.classList.contains('hidden')) {
      if (winState.isCollapsed) {
        this.toggleCollapse(id);
      } else {
        this.closeWindow(id);
      }
    } else {
      this.openWindow(id);
    }
  }

  toggleMaximize(id) {
    const winState = this.windows.get(id);
    if (!winState) return;

    winState.element.classList.toggle('maximized');
  }

  collapseAllWindows() {
    this.windows.forEach((winState) => {
      winState.isCollapsed = true;
      winState.element.classList.add('collapsed');
    });
  }

  expandAllWindows() {
    this.windows.forEach((winState) => {
      winState.isCollapsed = false;
      winState.element.classList.remove('collapsed');
      winState.element.classList.remove('hidden');
      winState.isOpen = true;
    });
  }

  hideAllWindows() {
    this.windows.forEach((winState) => {
      winState.element.classList.add('hidden');
      winState.isOpen = false;
    });
  }

  showAllWindows() {
    this.windows.forEach((winState) => {
      winState.element.classList.remove('hidden');
      winState.isOpen = true;
    });
  }

  updateDockDot(id, isOpen) {
    const dockItem = document.querySelector(`.dock-item[data-target="${id}"]`);
    if (dockItem) {
      dockItem.classList.toggle('active', isOpen);
    }
  }
}

window.MacOSWindowManager = MacOSWindowManager;
