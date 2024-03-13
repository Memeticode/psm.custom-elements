const express = require('express');
const path = require('path');
const app = express();
const port = 3000;


const options = [
  { value: '1', label: 'Option 1' },
  { value: '2', label: 'Option 2' },
  { value: '3', label: 'Option 3' },
  { value: '4', label: 'Aption 4' },
  { value: '5', label: 'Aption 5' },
  { value: '6', label: 'Aption 6' }
];


// Modify the express.static middleware to serve files from project root directory (instead of demo)
const projectRoot = path.join(__dirname, '..');
app.use(express.static(projectRoot));

app.get('/api/options', (req, res) => {
    // Retrieve the optional search query parameter
    const search = req.query.search;

    // Filter options based on the search parameter, ignore case
    const filteredOptions = search
        ? options.filter(option => option.label.toLowerCase().includes(search.toLowerCase()))
        : options;

    // Introduce a delay of 2 seconds
    setTimeout(() => {
        res.json(filteredOptions);
    }, 500);
});


// Update the path to the index.html file in the / route handler.
app.get('/', (req, res) => {
  res.sendFile(path.join(projectRoot, 'demo', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
