window.NEXUS_OSIRIS = window.NEXUS_OSIRIS || {};
let capaOsiris = null;

window.NEXUS_OSIRIS.cargarCCTVTexas = async function() {
  try {
    const res = await fetch('/api/osiris/cctv?region=texas');
    const data = await res.json();
    console.log('[OSIRIS] Datos recibidos:', data);

    if (capaOsiris && window.NEXUS_MAP) { window.NEXUS_MAP.removeLayer(capaOsiris); }
    
    capaOsiris = L.layerGroup();
    const canvasRenderer = L.canvas({ padding: 0.5 });
    let lista = Array.isArray(data) ? data : (data.cameras || []);

    let dibujadas = 0;
    lista.forEach(cam => {
      let lat = cam.lat || cam.latitude;
      let lon = cam.lon || cam.lng || cam.longitude;
      
      if (lat && lon) {
        L.circleMarker([lat, lon], {
          renderer: canvasRenderer,
          radius: 6, fillColor: '#22D3EE', color: '#fff', weight: 2, opacity: 1, fillOpacity: 0.9
        }).bindPopup('<b>📹 CCTV:</b><br>' + (cam.name || 'Cámara')) 
          .addTo(capaOsiris);
        dibujadas++;
      }
    });
    
    capaOsiris.addTo(window.NEXUS_MAP);
    
    // Si hay cámaras, hacemos zoom automático a Texas
    if (dibujadas > 0) {
        window.NEXUS_MAP.fitBounds(capaOsiris.getBounds(), { padding: [50, 50] });
    }
    
    console.log('[OSIRIS] CCTV cargado:', dibujadas, 'cámaras.');
    return data;
  } catch (err) { 
    console.error('[OSIRIS] Fallo:', err); 
    return null; 
  }
};

// Escuchador de eventos para el botón
(function() {
  const btn = document.getElementById('btn-osiris-cctv');
  if (btn) {
    btn.addEventListener('click', async () => {
      const textoOriginal = btn.innerText;
      btn.disabled = true; 
      btn.innerText = 'Cargando...';
      await window.NEXUS_OSIRIS.cargarCCTVTexas();
      btn.disabled = false; 
      btn.innerText = textoOriginal;
    });
  }
})();
