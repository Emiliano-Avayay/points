import { expect, test, type Page } from '@playwright/test';

async function freshStart(page: Page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.removeItem('summa-demo:state'));
  await page.goto('/');
}

async function noHorizontalScroll(page: Page) {
  const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
  expect(sw, `scroll horizontal en ${page.url()}`).toBeLessThanOrEqual(iw);
}

test.describe('Recorrido crítico', () => {
  test('admin acredita → cliente ve saldo y canjea → admin ve el canje', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

    await freshStart(page);
    // 1. Entrar como administrador
    await page.getByRole('button', { name: /^Café Molienda Cafetería/ }).click();
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    // 2. Seleccionar cliente
    await page.goto('/admin/clientes');
    await page.getByRole('link', { name: 'Acreditar puntos a Sofía Martínez' }).first().click();
    // 3. Acreditar
    await page.getByLabel('Monto de la compra').fill('200000');
    await expect(page.getByText('Se acreditan')).toBeVisible();
    await page.getByRole('button', { name: 'Acreditar puntos' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Confirmar' }).dblclick();
    await expect(page.getByRole('heading', { name: '+2.600 puntos acreditados' })).toBeVisible();
    // 4. Cambiar a la vista cliente
    await page.getByRole('button', { name: 'Ver como cliente' }).click();
    // 5. Consultar el nuevo saldo
    await expect(page).toHaveURL(/\/app\/puntos/);
    await expect(page.getByText('3.180').first()).toBeVisible();
    // 6. Canjear un premio
    await page.goto('/app/premios');
    await page.getByRole('link', { name: /Vaso térmico/ }).click();
    await page.getByRole('button', { name: 'Canjear premio' }).click();
    // Doble clic: el segundo clic no debe generar un segundo canje.
    await page.getByRole('button', { name: 'Canjear por 2.000 pts' }).dblclick();
    await page.waitForTimeout(500);
    const reds = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('summa-demo:state')!).state.redemptions.filter(
        (r: { customerId: string; rewardId: string }) => r.customerId === 'c-sofia' && r.rewardId === 'rw-cafe-vaso',
      ),
    );
    expect(reds).toHaveLength(1);
    const code: string = reds[0].code;
    await page.goto('/app/canjes');
    await expect(page.getByText(code)).toBeVisible();
    await expect(page.getByRole('link', { name: /1\.180 puntos/ })).toBeVisible();
    // 7. Volver a administración
    await page.getByRole('button', { name: 'Abrir menú' }).click();
    await page.getByRole('button', { name: 'Cambiar a administrador' }).click();
    // 8. Ver reflejado el canje
    await page.goto('/admin/canjes');
    await expect(page.getByText(code)).toBeVisible();
    await page.getByRole('button', { name: 'Marcar entregado' }).first().click();
    await expect(page.getByText('Canje entregado')).toBeVisible();
    // Persistencia tras recargar
    await page.goto('/admin/clientes/c-sofia');
    await expect(page.getByText('1.180 pts').first()).toBeVisible();
    expect(errors, errors.join('\n')).toEqual([]);
  });
});

test.describe('Cliente', () => {
  test.beforeEach(async ({ page }) => {
    await freshStart(page);
    await page.getByRole('button', { name: /Sofía Martínez/ }).click();
    await expect(page.getByRole('link', { name: /580 puntos/ })).toBeVisible();
  });

  test('saldo insuficiente informa cuánto falta', async ({ page }) => {
    await page.goto('/app/premios/rw-cafe-tarta');
    const btn = page.getByRole('button', { name: 'Te faltan 920 pts' });
    await expect(btn).toBeDisabled();
    await expect(page.getByText('Te faltan 920 puntos para este premio')).toBeVisible();
  });

  test('búsqueda, filtros y favoritos persistentes', async ({ page }) => {
    await page.goto('/app/premios');
    await page.getByLabel('Buscar premios').fill('medialunas');
    await expect(page.getByRole('link', { name: /Café \+ dos medialunas/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Tarta a elección/ })).toHaveCount(0);
    await page.getByLabel('Buscar premios').fill('');
    await page.getByRole('radio', { name: /Helados/ }).click();
    await expect(page.getByRole('link', { name: /Un kilogramo de helado/ })).toBeVisible();
    await page.getByRole('button', { name: 'Agregar Un kilogramo de helado a favoritos' }).click();
    await page.reload();
    await page.goto('/app/favoritos');
    await expect(page.getByRole('link', { name: /Un kilogramo de helado/ })).toBeVisible();
    await page.getByRole('button', { name: 'Quitar Un kilogramo de helado de favoritos' }).click();
    await expect(page.getByRole('link', { name: /Un kilogramo de helado/ })).toHaveCount(0);
  });

  test('cambiar de comercio no mezcla saldos ni catálogos', async ({ page }) => {
    await page.getByRole('button', { name: /Comercio activo: Café Molienda/ }).click();
    await page.getByRole('dialog').getByRole('button', { name: /Patitas Pet Shop/ }).click();
    await expect(page.getByRole('link', { name: /en Patitas Pet Shop/ }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /580 puntos/ })).toHaveCount(0);
    await page.goto('/app/premios');
    await expect(page.getByRole('link', { name: /Alimento balanceado/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Vaso térmico/ })).toHaveCount(0);
  });

  test('referidos, desafíos y encuestas simulados', async ({ page }) => {
    await page.goto('/app/invitar');
    await page.getByLabel('Nombre de tu amigo o amiga').fill('Paula Ibarra');
    await page.getByRole('button', { name: 'Invitar' }).click();
    await page.getByRole('button', { name: 'Simular primera compra' }).click();
    await expect(page.getByText('¡Sumaste 100 puntos!')).toBeVisible();
    await expect(page.getByRole('link', { name: /680 puntos/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Simular primera compra' })).toHaveCount(0);

    await page.goto('/app/desafios');
    await page.getByRole('button', { name: 'Simular compra' }).click();
    await page.getByRole('button', { name: 'Simular compra' }).click();
    await page.getByRole('button', { name: 'Reclamar 150 puntos' }).click();
    await expect(page.getByRole('link', { name: /830 puntos/ })).toBeVisible();

    await page.goto('/app/eventos');
    await page.getByRole('tab', { name: 'Encuestas' }).click();
    await page.getByLabel('Rogel').check();
    await page.getByRole('button', { name: 'Enviar respuesta' }).click();
    await expect(page.getByRole('link', { name: /860 puntos/ })).toBeVisible();
  });

  test('copiar enlace de referido', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/app/invitar');
    await page.getByRole('button', { name: 'Copiar enlace' }).click();
    await expect(page.getByText('Enlace copiado')).toBeVisible();
  });
});

test.describe('Administración', () => {
  test.beforeEach(async ({ page }) => {
    await freshStart(page);
    await page.getByRole('button', { name: /^Café Molienda Cafetería/ }).click();
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('ajuste que dejaría saldo negativo se rechaza', async ({ page }) => {
    await page.goto('/admin/acreditar?cliente=c-sofia&modo=ajuste');
    await page.getByRole('tab', { name: 'Descontar' }).click();
    await page.getByLabel('Cantidad de puntos').fill('600');
    await page.getByLabel('Justificación').fill('Prueba');
    await page.getByRole('button', { name: 'Registrar ajuste' }).click();
    await expect(page.getByText('No podés descontar más que el saldo (580 pts).')).toBeVisible();
    await page.getByLabel('Cantidad de puntos').fill('80');
    await page.getByRole('button', { name: 'Registrar ajuste' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Confirmar' }).click();
    await expect(page.getByRole('heading', { name: 'Ajuste de −80 puntos' })).toBeVisible();
  });

  test('crear, editar y desactivar premios', async ({ page }) => {
    await page.goto('/admin/premios');
    await page.getByRole('button', { name: 'Nuevo premio' }).click();
    const dlg = page.getByRole('dialog');
    await dlg.getByLabel('Nombre').fill('Muffin de arándanos');
    await dlg.getByLabel('Categoría').fill('Pastelería');
    await dlg.getByLabel('Costo en puntos').fill('700');
    await dlg.getByRole('button', { name: 'Crear premio' }).click();
    await expect(page.getByRole('heading', { name: 'Muffin de arándanos' })).toBeVisible();
    await page.getByRole('button', { name: 'Editar Muffin de arándanos' }).click();
    await page.getByRole('dialog').getByLabel('Costo en puntos').fill('750');
    await page.getByRole('dialog').getByRole('button', { name: 'Guardar cambios' }).click();
    await page.getByRole('switch', { name: 'Desactivar Muffin de arándanos' }).click();
    await expect(page.getByRole('switch', { name: 'Activar Muffin de arándanos' })).toBeVisible();
  });

  test('crear comercio con estados vacíos y restablecer la demo', async ({ page }) => {
    await page.goto('/admin/comercios/nuevo');
    await page.getByLabel('Nombre del comercio').fill('Librería Papiro');
    await page.getByLabel('Rubro').fill('Librería');
    await page.getByRole('button', { name: 'Crear comercio' }).click();
    await expect(page.getByText('Este comercio todavía no tiene clientes')).toBeVisible();
    await page.goto('/admin/premios');
    await expect(page.getByText('El catálogo está vacío')).toBeVisible();

    await page.goto('/');
    await page.getByRole('button', { name: 'Restablecer demo' }).click();
    await page.getByRole('button', { name: 'Sí, restablecer' }).click();
    await expect(page.getByText('Demo restablecida')).toBeVisible();
    await expect(page.getByRole('button', { name: /Librería Papiro/ })).toHaveCount(0);
  });

  test('campaña con vista previa simulada', async ({ page }) => {
    await page.goto('/admin/campanas');
    await page.getByRole('radio', { name: /Aviso de saldo disponible/ }).click();
    await expect(page.getByText(/Ya te alcanzan para canjear un premio/).last()).toBeVisible();
    await page.getByRole('button', { name: 'Simular envío' }).click();
    await expect(page.getByText('Envío simulado')).toBeVisible();
  });
});

test.describe('Responsive y rutas', () => {
  const routes = ['/', '/app', '/app/premios', '/app/premios/rw-cafe-medialunas', '/app/puntos', '/app/canjes', '/app/invitar', '/app/bonificaciones', '/app/desafios', '/app/niveles', '/app/eventos', '/app/perfil', '/app/sumar', '/app/comercios', '/admin', '/admin/clientes', '/admin/acreditar', '/admin/premios', '/admin/canjes', '/admin/promociones', '/admin/campanas', '/admin/configuracion'];
  for (const width of [320, 375, 390, 430, 768, 1280]) {
    test(`sin scroll horizontal a ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await freshStart(page);
      for (const r of routes) {
        await page.goto(r);
        await page.waitForLoadState('networkidle');
        await noHorizontalScroll(page);
      }
      await page.goto('/app');
      await page.waitForTimeout(800);
      await page.screenshot({ path: `playwright-screens/home-${width}.png`, fullPage: true });
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(800);
      await page.screenshot({ path: `playwright-screens/admin-${width}.png`, fullPage: true });
    });
  }

  test('las imágenes de premios cargan sin roturas', async ({ page }) => {
    await freshStart(page);
    for (const m of ['m-cafe', 'm-pets', 'm-tech']) {
      const broken = await page.evaluate(async (merchant) => {
        const s = JSON.parse(localStorage.getItem('summa-demo:state')!).state;
        const imgs: string[] = s.rewards.filter((r: { merchantId: string }) => r.merchantId === merchant).map((r: { image: string }) => r.image);
        const res = await Promise.all(imgs.map((src) => fetch(src).then((x) => (x.ok ? null : src))));
        return res.filter(Boolean);
      }, m);
      expect(broken).toEqual([]);
    }
  });
});
