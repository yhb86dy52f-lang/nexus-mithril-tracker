document.addEventListener('DOMContentLoaded', () => {
    const btns = document.querySelectorAll('button, a');
    let apagarBtn = null;
    for (let b of btns) {
        const txt = b.innerText.trim().toUpperCase();
        if (txt === 'APAGAR' || txt === 'ENCENDER') { 
            apagarBtn = b; 
            break; 
        }
    }
    
    if (apagarBtn) {
        let isPaused = false;
        
        // Verificar estado inicial
        fetch('/api/system/status')
            .then(r => r.json())
            .then(d => {
                isPaused = d.paused;
                updateBtn();
            }).catch(() => {});

        function updateBtn() {
            if (isPaused) {
                apagarBtn.innerText = 'ENCENDER';
                apagarBtn.style.backgroundColor = '#22c55e'; 
                apagarBtn.style.color = 'white';
                apagarBtn.style.border = 'none';
            } else {
                apagarBtn.innerText = 'APAGAR';
                apagarBtn.style.backgroundColor = 'transparent';
                apagarBtn.style.color = '#ef4444'; 
                apagarBtn.style.border = '1px solid #ef4444';
            }
        }

        apagarBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const action = isPaused ? 'resume' : 'pause';
            
            try {
                const res = await fetch('/api/system/toggle', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action })
                });
                const data = await res.json();
                isPaused = data.paused;
                updateBtn();
                
                // Recargar los datos
                if (typeof window.cargarDatos === 'function') window.cargarDatos();
                else if (typeof window.actualizarMapa === 'function') window.actualizarMapa();
                else window.location.reload();
                
            } catch (err) {
                console.error('Error toggling system:', err);
            }
        });
    }
});