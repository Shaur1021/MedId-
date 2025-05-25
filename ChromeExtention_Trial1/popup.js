async function call_gpt(symptoms, duration) {
  const response = await fetch('https://medid-backend.onrender.com/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symptoms, duration })
  });
  const data = await response.json();
  return data;
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('analyzeBtn').addEventListener('click', async () => {
    const symptoms = document.getElementById('symptoms').value.trim();
    const duration = document.getElementById('duration').value.trim();
    const resultsDiv = document.getElementById('results');

    if (!symptoms || !duration) {
      resultsDiv.textContent = "Please enter both symptoms and duration.";
      return;
    }

    resultsDiv.textContent = "Analyzing...";

    try {
      const data = await call_gpt(symptoms, duration);

      if (data.results && Array.isArray(data.results)) {
        resultsDiv.innerHTML = data.results.map(result => {
          if (result.raw) {
            // Show raw text if structured fields are missing
            return `<div style="margin-bottom:12px;">${result.raw}</div>`;
          }

          // Format possible_cases (array of objects with name/description)
          let casesHtml = "Unknown";
          if (Array.isArray(result.possible_cases) && result.possible_cases.length > 0) {
            let validCases = result.possible_cases.filter(c =>
              (typeof c === "object" && c !== null && c.name) || typeof c === "string"
            );
            if (validCases.length > 0) {
              casesHtml = "<ul style='margin:0;padding-left:18px;'>";
              validCases.forEach(c => {
                if (typeof c === "object" && c !== null) {
                  casesHtml += `<li><strong>${c.name}</strong>${c.description ? ": " + c.description : ""}</li>`;
                } else if (typeof c === "string") {
                  casesHtml += `<li>${c}</li>`;
                }
              });
              casesHtml += "</ul>";
            }
          }

          // Format selected_case_details (object with description and recommended_actions)
          let detailsHtml = "N/A";
          if (typeof result.selected_case_details === "object" && result.selected_case_details !== null) {
            detailsHtml = `<div>${result.selected_case_details.description || ""}`;
            if (Array.isArray(result.selected_case_details.recommended_actions)) {
              detailsHtml += "<ul style='margin:0;padding-left:18px;'>";
              result.selected_case_details.recommended_actions.forEach(a =>
                detailsHtml += `<li>${a}</li>`
              );
              detailsHtml += "</ul>";
            }
            detailsHtml += "</div>";
          } else if (typeof result.selected_case_details === "string") {
            detailsHtml = result.selected_case_details;
          }

          // Format emergency_advice (object with when_to_seek_immediate_attention and contact)
          let adviceHtml = "N/A";
          if (result.hasOwnProperty('emergency_advice')) {
            if (typeof result.emergency_advice === "object" && result.emergency_advice !== null) {
              adviceHtml = "";
              if (Array.isArray(result.emergency_advice.when_to_seek_immediate_attention)) {
                adviceHtml += "<strong>When to seek immediate attention:</strong><ul style='margin:0;padding-left:18px;'>";
                result.emergency_advice.when_to_seek_immediate_attention.forEach(a =>
                  adviceHtml += `<li>${a}</li>`
                );
                adviceHtml += "</ul>";
              }
              if (Array.isArray(result.emergency_advice.contact)) {
                adviceHtml += "<strong>Contact:</strong><ul style='margin:0;padding-left:18px;'>";
                result.emergency_advice.contact.forEach(a =>
                  adviceHtml += `<li>${a}</li>`
                );
                adviceHtml += "</ul>";
              }
              if (adviceHtml === "") adviceHtml = "N/A";
            } else if (typeof result.emergency_advice === "string") {
              adviceHtml = result.emergency_advice || "N/A";
            }
          }

          return `
            <div style="margin-bottom:12px;">
              <strong>Possible cases:</strong> ${casesHtml}
              <div style="height:16px"></div>
              <strong>Most likely case:</strong> ${result.selected_case || "N/A"}
              <div style="height:16px"></div>
              <strong>Details:</strong> ${detailsHtml}
              <div style="height:16px"></div>
              <strong>Emergency advice:</strong> ${adviceHtml}
            </div>
          `;
        }).join('');
      } else if (data.error) {
        resultsDiv.textContent = "Error: " + data.error;
      } else {
        resultsDiv.textContent = "No results found.";
      }
    } catch (e) {
      resultsDiv.textContent = "An error occurred: " + (e.message || e);
    }
  });
});