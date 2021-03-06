/* CLIENT */

const socket = io()

//Shortcut elementi
const $messageForm = document.querySelector('#message-form')
const $messageFormInput = $messageForm.querySelector('#input-message')
const $messageFormButton = $messageForm.querySelector('button')
const $sendLocationButton = document.querySelector('#send-location')
const $messages = document.querySelector('#messages')

//Shortcut template
const messageTemplate = document.querySelector('#message-template').innerHTML
const locationMessageTemplate = document.querySelector('#location-message-template').innerHTML
const sidebarTemplate = document.querySelector('#sidebar-template').innerHTML

//Parsing e destrutturazione della query string
const { username, room } =  Qs.parse(location.search, { ignoreQueryPrefix: true })

const autoscroll = () => {
    //Elemento del nuovo messaggio
    const $newMessage = $messages.lastElementChild

    //Recupera lo stile del nuovo messaggio
    const newMessageStyles = getComputedStyle($newMessage)
    //Estrae il margine del nuovo messaggio dallo stile
    const newMessageMargin = parseInt(newMessageStyles.marginBottom)
    //Calcola l'altezza effettiva del nuovo messaggio (altezza contenuto + margine)
    const newMessageHeight = $newMessage.offsetHeight + newMessageMargin

    //Recupera l'altezza visibile del blocco dei messaggi
    const visibleHeight = $messages.offsetHeight

    //Recupera l'altezza totale del container dei messaggi 
    const containerHeight = $messages.scrollHeight

    //Quanto dista la barra di scroll dal bottom? (distanza della barra di scroll dal top della pagina + altezza visibile blocco messaggi)
    const scrollOffset = $messages.scrollTop + visibleHeight

    //Se l'altezza totale del container dei messaggi meno l'altezza effettiva del nuovo messaggio è minore o uguale alla distanza della barra di scroll dal bottom
    if (containerHeight - newMessageHeight <= scrollOffset) {
        //Esegue l'autoscroll
        $messages.scrollTop = $messages.scrollHeight
    }
}

//Controlla l'evento 'message' per ricevere i messaggi in arrivo dal server
socket.on('message', (message) => {
    //Stampa il messaggio a console
    console.log(message)
    //Crea una costante dove renderizzare il template contenuto nella pagina HTML e il messaggio ricevuto dal server
    const html = Mustache.render(messageTemplate, {
        username: message.username,
        message: message.text,
        createdAt: moment(message.createdAt).format('dd D MMM H:mm:ss')
    })
    //Inserisce il template dinamicamente nell'elemento HTML #messages
    $messages.insertAdjacentHTML('beforeend', html)
    autoscroll()
})

//Controlla l'evento 'locationMessage' per ricevere le posizioni in arrivo dal server
socket.on('locationMessage', (message) => {
    //Stampa la posizione a console
    console.log(message)
    //Crea una costante dove renderizzare il template contenuto nella pagina HTML e la posizione ricevuta dal server
    const html = Mustache.render(locationMessageTemplate, {
        username: message.username,
        url: message.url,
        createdAt: moment(message.createdAt).format('dd D MMM H:mm:ss')
    })
    //Inserisce il template dinamicamente nell'elemento HTML #messages
    $messages.insertAdjacentHTML('beforeend', html)
    autoscroll()
})

//Controlla l'evento 'roomData' per aggiornare la lista degli utenti in una room
socket.on('roomData', ({ room, users }) => {
    console.log(room)
    console.log(users)
    const html = Mustache.render(sidebarTemplate, {
        room,
        users,
    })
    document.querySelector('#sidebar').innerHTML = html
})

//Targhettizza il form per l'invio di un messaggio e crea l'evento 'submit'
$messageForm.addEventListener('submit', (e) => {
    //Previene il refresh automatico della pagina HTML
    e.preventDefault()

    //Disabilita il form una volta inviato il messaggio
    $messageFormButton.setAttribute('disabled', 'disabled')

    //Recupera il messaggio dal form HTML
    const message = e.target.elements.message.value
    // //Versione alternativa della linea precedente
    // const message = document.querySelector('#input-message').value

    //Emette un evento da mandare al server passandogli il messaggio recuperato dal form e una callback per l'acknowledge
    socket.emit('sendMessage', message, (error) => {
        //Riabilita il form
        $messageFormButton.removeAttribute('disabled')
        //Svuota il form dal messaggio appena inviato
        $messageFormInput.value = ''
        //Muove il cursore all'interno del form
        $messageFormInput.focus()

        if (error) {
            return console.log(error)
        }

        console.log('Message delivered!')
    })
})

//Targhettizza il pulsante per condividere la posizione e crea l'evento 'click'
$sendLocationButton.addEventListener('click', () => {
    //Se il browser non supporta questa funzione viene restituito un messaggio di errore
    if (!navigator.geolocation) {
        return alert('Geolocation is not supported by your browser')
    }

    //Disabilita il pulsante una volta condivisa la posizione
    $sendLocationButton.setAttribute('disabled', 'disabled')

    //Altrimenti manda al server un nuovo evento 'sendLocation' con un oggetto contenente latitudine e longitudine
    navigator.geolocation.getCurrentPosition((position) => {
        //Riabilita il pulsante
        $sendLocationButton.removeAttribute('disabled')

        socket.emit('sendLocation', {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
        }, () => {
            console.log('Location shared!')
        })
    })
})

//Invia al server il nome utente e la room alla quale connettersi
socket.emit('join', { username, room }, (error) => {
    //Se il server restituisce un errore lo visualizza e reindirizza all'home page
    if (error) {
        alert(error)
        location.href='/'
    }
})