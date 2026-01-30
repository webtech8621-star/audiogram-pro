export const calculateProvisionalDiagnosis = (formData, ptaValues) => {
    const TARGET_FREQS = [500, 1000, 2000];

    const getEarResult = (acKey, bcKey, bcMaskedKey, pta) => {
        let abgOver15 = false;
        let bcOver15 = false;
        let validCount = 0;

        TARGET_FREQS.forEach(freq => {
            const row = formData.find(r => r.freq === freq);
            if (!row) return;

            const ac = row[acKey] !== "" ? Number(row[acKey]) : null;
            const bcMasked = row[bcMaskedKey] !== "" ? Number(row[bcMaskedKey]) : null;
            const bcUnmasked = row[bcKey] !== "" ? Number(row[bcKey]) : null;

            const bc = bcMasked ?? bcUnmasked;

            if (ac === null || bc === null) return;

            validCount++;

            const abg = ac - bc;
            if (abg > 15) abgOver15 = true;
            if (bc > 15) bcOver15 = true;
        });

        let type = "Sensorineural";
        if (abgOver15 && bcOver15) type = "Mixed";
        else if (abgOver15) type = "Conductive";

        let severityText = "Unable to Determine";
        if (typeof pta === "number") {
            if (pta <= 15) severityText = "Normal Hearing Sensitivity";
            else if (pta <= 25) severityText = "Minimal Hearing Loss";
            else if (pta <= 40) severityText = "Mild Sensorineural Hearing Loss";
            else if (pta <= 55) severityText = "Moderate Sensorineural Hearing Loss";
            else if (pta <= 70) severityText = "Moderately Severe Sensorineural Hearing Loss";
            else if (pta <= 90) severityText = "Severe Sensorineural Hearing Loss";
            else severityText = "Profound Hearing Loss";
        }

        if (severityText.includes("Sensorineural")) {
            if (type === "Conductive") {
                severityText = severityText.replace("Sensorineural", "Conductive");
            } else if (type === "Mixed") {
                severityText = severityText.replace("Sensorineural", "Mixed");
            }
        }

        return {
            type,
            severity: severityText,
            validFrequenciesUsed: validCount,
        };
    };

    return {
        right: getEarResult("ACR", "BCR", "BCR_M", ptaValues.right),
        left: getEarResult("ACL", "BCL", "BCL_M", ptaValues.left),
    };
};