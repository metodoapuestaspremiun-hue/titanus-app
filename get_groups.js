const axios = require('axios');
const fs = require('fs');

async function getGroups() {
    try {
        const url = 'http://129.153.116.213:8080/group/fetchAllGroups/gym_bot?getParticipants=false';
        console.log(`Fetching from ${url}...`);
        
        const response = await axios.get(url, {
            headers: {
                'apikey': '42a447c1-3d74-4b52-9571-042c174f7621',
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.data || response.data.length === 0) {
            console.log("No groups found.");
            return;
        }
        
        console.log("=== YOUR WHATSAPP GROUPS ===");
        response.data.forEach(group => {
            console.log(`Name: ${group.subject || 'Unknown'}`);
            console.log(`ID: ${group.id}`);
            console.log('------------------------');
        });
        
        fs.writeFileSync('mis_grupos.txt', JSON.stringify(response.data, null, 2));
        console.log("Detailed info saved to mis_grupos.txt");

    } catch (error) {
        console.error("Error fetching groups:", error.response?.data || error.message);
    }
}

getGroups();
