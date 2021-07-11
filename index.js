const http = require('http')
const prompt = require('prompt')
const chalk = require('chalk')
const events = require('events')

const emitter = new events.EventEmitter()

const stdout = process.stdout

const displayMessage = (msg) => {
    stdout.clearLine()
    stdout.cursorTo(0, stdout.rows - 2)
    stdout.write(' '.repeat(stdout.columns))
    stdout.cursorTo(0, stdout.rows - 1)
    console.log(msg + '\n')
    stdout.cursorTo(0, stdout.rows - 2)
    console.log('-'.repeat(stdout.columns))
    stdout.cursorTo(0, stdout.rows - 1)
}

const clearPrompt = (text) => {
    stdout.cursorTo(0, stdout.rows - 2 - Math.ceil((text.length) / stdout.columns))
    stdout.write(' '.repeat(stdout.columns))
    stdout.cursorTo(0, stdout.rows - 1)
    console.log('-'.repeat(stdout.columns))
}

const server = http.createServer((req, res) => {
    let body = ''
    req.on('data', (data) => {
        body += data
    })

    req.on('end', () => {
        const message = JSON.parse(body.toString())

        switch (message.type) {
            case 'none':
                res.end(JSON.stringify({
                    type: 'none'
                }))
                break
            case 'who':
                res.end(JSON.stringify({
                    who: author
                }))
                break
            case 'message':
                displayMessage(chalk.cyan.bold(message.author + ': ') + chalk.cyan(message.message))
                res.end(JSON.stringify({
                    type: 'none'
                }))
                break
            case 'left':
                displayMessage(chalk.cyan(message.author + ' left'))
                res.end(JSON.stringify({
                    left : 'response'
                }))
                break
            case 'name':
                displayMessage(chalk.cyan(message.author + ' changed their name'))
                res.end(JSON.stringify({
                    type: 'none'
                }))
                break
        }

    })
})

server.listen(4343, () => {})

let author
let receiver

console.clear()
displayMessage(chalk.green.bold('Welcome to chatCLI!') + '\n' + chalk.green.italic('use .help once you answer these prompts to get started'))
prompt.message = ''
prompt.delimiter = ''
prompt.start()

emitter.on('name-start', () => {
    displayMessage(chalk.yellow('enter a valid username (letters A-Z, numbers and hyphens): '))
    prompt.get(['username'], function (err, result) {
        clearPrompt('prompt: username: ' + result.username)
        if (err || !/^([a-zA-Z0-9]|-)+$/.test(result.username)) {
            author = 'default-' + Math.round(Math.random() * 100000000, 10)
            displayMessage(chalk.red.bold('Invalid username. Setting username to: ' + author + '\n', chalk.gray('Use .name to change it.\n')))
        } else {
            author = result.username
        }
        emitter.emit('ip')
    })
})
emitter.on('ip', () => {
    displayMessage(chalk.yellow('enter an server address: '))
    prompt.get(['ip'], function (err, result) {
        clearPrompt('ip ' + result.ip)
        if (err || !/[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b/.test(result.ip)) {
            receiver = '127.0.0.1'
            displayMessage(chalk.red.bold('Invalid address. Setting address to: ' + receiver + '\n', chalk.gray('Use .receiver to change it.\n')))
        } else {
            receiver = result.ip
        }
        emitter.emit('message')
    })
})
emitter.on('name', () => {
    displayMessage(chalk.yellow('enter a valid username (letters A-Z, numbers and hyphens): \n'))
    prompt.get(['username'], function (err, result) {
        clearPrompt('username ' + result.username)
        if (err || !/^([a-zA-Z0-9]|-)+$/.test(result.username)) {
            author = 'default-' + Math.round(Math.random() * 100000000, 10)
            displayMessage(chalk.red.bold('Invalid username. Setting username to: ' + author + '\n', chalk.gray('Use .name to change it.\n')))
        } else {
            author = result.username
        }
        emitter.emit('message')
    })
})

emitter.on('message', () => {
    prompt.get(['message'], (err, result) => {
        clearPrompt('message ' + result.message)

        let data
        let options
        let exiting = false
        let message = result.message

        switch (message) {
            case '.help':
                data = JSON.stringify({
                    type: 'none'
                })
                displayMessage(
                    `${chalk.greenBright.bold('.help') + chalk.green(': view this menu')}
${chalk.greenBright.bold('.who') + chalk.green(': see the username of who you are talking to')}
${chalk.greenBright.bold('.receiver') + chalk.green(': change who you are messaging')}
${chalk.greenBright.bold('.name')+ chalk.green(': change your username')}
${chalk.greenBright.bold('.exit')+ chalk.green(': close server and exit')}
                `)
                emitter.emit('message')
                break
            case '.who':
                data = JSON.stringify({
                    type: 'who',
                })
                break
            case '.receiver':
                emitter.emit('ip')
                data = JSON.stringify({
                    type: 'none'
                })
                break
            case '.name':
                emitter.emit('name')
                data = JSON.stringify({
                    type: 'name',
                    author
                })
                break
            case '.exit':
                exiting = true
                if(receiver === '127.0.0.1'){
                    data = JSON.stringify({
                        type: 'none',
                    })
                } else {
                    data = JSON.stringify({
                        type: 'left',
                        author
                    })
                }
                break
            default:
                data = JSON.stringify({
                    type: 'message',
                    message,
                    author
                })
                if (!(receiver === '127.0.0.1')) {
                displayMessage(chalk.cyan.bold(author + ': ') + chalk.cyan(message))
                }
                emitter.emit('message')
        }

        options = {
            hostname: receiver,
            port: 4343,
            path: '/',
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        }

        const req = http.request(options, res => {
            res.on('data', (data) => {
                const info = JSON.parse(data.toString())
                if (info.who) {
                    displayMessage(chalk.blue('\ntalking to ' + info.who + ' at ' + receiver))
                    emitter.emit('message')
                }
            })
        })

        req.write(data)
        req.end()

        if(exiting){
            displayMessage(chalk.greenBright('exited successfully'))
            server.close()
            process.exit()
        }
    })
})

emitter.emit('name-start')