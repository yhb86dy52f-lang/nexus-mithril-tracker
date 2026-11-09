window.exportRawData = async function(deviceId) {
    try {
        const res = await fetch(`/api/device/${deviceId}/raw-sms`);
        const data = await res.json();
        
        // PROTECCIÓN: Si no es un arreglo, mostrar el error
        if (!Array.isArray(data)) {
            alert('El servidor devolvió un error: ' + JSON.stringify(data));
            return;
        }

        if (data.length === 0) {
            alert('No hay tramas crudas registradas para este equipo todavía.');
            return;
        }

        let fileContent = `=== RAW SMS DATA PARA ${deviceId} ===\n\n`;
        data.forEach(r => {
            fileContent += `[${r.timestamp}]\n${r.texto}\n\n${'-'.repeat(50)}\n\n`;
        });

        const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `raw_sms_${deviceId}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        
    } catch (err) {
        console.error(err);
        alert('Error de red descargando los datos.');
    }
};