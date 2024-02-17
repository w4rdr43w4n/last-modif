const express = require('express')
const bodyParser = require('body-parser')
const app = express()
// Local libs

const { searchInArxiv } = require('./arxiv')
const { searchInArchive } = require('./archive')
const { searchInSemantic } = require('./semantic')
const { searchAndProcess, plagiarism ,documentation, literature} = require('./literature_utils')
const { searchAndDoc } = require('./literature_utils')
const { default: axios } = require('axios')
// Server Configuration
const PORT = 3000
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
// URLs
app.get('/', (req, res) => {
  res.render('home', { output: '', literature: '', plgRes: '', ref: '' ,lr_ct:''})
});

app.post('/search', (req, res) => {
  const buttonClicked = req.body.button;
  let query = req.body.inputText;
  app.locals.query = query
  console.log(`Searching for ${query}....`)
  console.log(`BUTTON: ${buttonClicked} is clicked!`)
  search(query, buttonClicked).then((sre) => {
    app.locals.searchResults = sre
    let o = parse_results(sre)
    app.locals.results = o
    res.render('home', { output: o, literature: '', plgRes: '', ref: '',lr_ct:'' })
  }).catch((err) => {
    console.log(`Error :${err}`)
  })
})

app.post('/lr', async (req, res) => {
  let query = app.locals.query;
  let style = req.body.selectedCitationType
  console.log(`Generating LR for ${query}, with style ${style}`)
  try {
    const sre = await searchAndProcess(`${query}`, `${style}`);
    app.locals.literature = sre.data
    res.render('home', { output: app.locals.results, literature: sre.data, plgRes: '', ref: '',lr_ct:''});
  } catch (error) {
    // Handle any errors that occur during the searchAndDoc call
    console.error(error);
    // res.status(500).send('An error occurred while searching and documenting.');
  }
});

app.post('/plg', async (req, res) => {
  let txt = req.body.plgText
  console.log('Checking for plagiarism in provided text...')
  let l = (app.locals.literatur)? app.locals.literatur:''
  let o = (app.locals.results)? app.locals.results:''
  try {
    const sre = await plagiarism(`${txt}`)
    res.render('home', { output: o, literature: '', plgRes: sre.data, ref: '',lr_ct:''})
  } catch (err) {
    console.error(err)
  }
})

app.get('/NewRefpage',(req,res)=>{
  res.render('newRef')  
})
app.get('/Newliterpage',(req,res)=>{
  res.render('liter')  
})
app.post('/createNewRef',async(req,res)=>{
console.log('CREATE NEW REF FORM')
let title = req.body.title
let authors;
if (req.body.authors.includes(',')) {
    authors = req.body.authors.split(',');
} else {
    authors = [req.body.authors];
}

let year = req.body.published
let pdf = req.body.pdf
let style = `${req.body.selectedRefCitationType}`
let l = (app.locals.literatur)? app.locals.literatur:''
let o = (app.locals.results)? app.locals.results:''
const info = {'title':title,'authors':authors,'pdf_url':pdf,'published':year}

const option = req.body.button
console.log(`Button ${option} is clicked`)
app.locals.refList = app.locals.refList ? [...app.locals.refList, info] : [info];
if(option === 'createRef'){
  try {
    let list = app.locals.refList
    const sre = await documentation(list,style)
    res.render('home', { output:o, literature: l, plgRes:'', ref: sre.data,lr_ct:''})
  } catch (err) {
    console.error(err)
  }
} else {
  res.render('newRef')
  let list = app.locals.refList
  list.forEach(element => {
    console.log(`refs:${element}`)
  });
  
}

})
app.post('/createNewliter',async(req,res)=>{
  console.log('CREATE NEW literature FORM')
  let title = req.body.title
  let subject = req.body.subject;

  // Check if subject is already set and if so, skip setting it again
  if (typeof subject === 'undefined' || subject === '') {
    subject = req.body.subject;
  }
  let authors;
  if (req.body.authors.includes(',')) {
      authors = req.body.authors.split(',');
  } else {
      authors = [req.body.authors];
  }
  abstract = req.body.abstract
  let year = req.body.year
  let pdf = req.body.pdfurl
  let style = `${req.body.selectedRefCitationType}`
  let l = (app.locals.literatur)? app.locals.literatur:''
  let o = (app.locals.results)? app.locals.results:''
  const info = {'title':title,'authors':authors,'pdf_url':pdf,'abstract':abstract,'published':year}
  
  const option = req.body.button
  console.log(`Button ${option} is clicked`)
  app.locals.refList = app.locals.refList ? [...app.locals.refList, info] : [info];
  if(option === 'createliter'){
    try {
      let list = app.locals.refList
      const sre = await literature(list,style,subject)
      res.render('home', { output:o, literature: l, plgRes:'',ref:'',lr_ct: sre.data })
    } catch (err) {
      console.error(err)
    }
  } else {
    res.render('liter')
    let list = app.locals.refList
    list.forEach(element => {
      console.log(`refs:${element}`)
    });
    
  }
  
  })
//Initializing the server
app.listen(PORT, () => {
  console.log(`Server is listening at http://localhost:${PORT}`)
});


async function search(query, engine) {
  switch (engine) {
    case 'arxiv':
      var res = await searchInArxiv(`${query}`)
      break;
    case 'archive':
      var res = await searchInArchive(`${query}`)
      break;
    case 'semantic':
      var res = await searchInSemantic(`${query}`)
      break;
    case 'LR':
      var res = searchAndDoc(`${query}`, 'apa')
      break;
    // default:
    // var res = await searchInArxiv(`${query}`)
  }
  return res
}

function parse_results(results) {
  var htmlRes = ''
  for (let r of results) {
    var item = `<div class='item'><h4>Title:${r.title}</h4><h4>Author:${r.authors}</h4><h4>Published:${r.published}</h4><h4>PDF:<a href='${r.pdf_url}'>Download</a></h4></div>`
    htmlRes += item
  }
  return htmlRes
}



