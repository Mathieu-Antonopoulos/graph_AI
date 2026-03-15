
function read_message(event) {
    content = JSON.parse(event.data);
    switch (content.type) {
        case "ping":
            send_pong()
            break
    
        case "pop-up":
            read_popup_message(content.data);
            break;
        
        case "error": content.data['type'] = 'server-error'
        case "toast":
            read_toast_message(content.data);
            break;

        case "navigation":
            read_navigation_message(content.data);
            break

        case "loading":
            read_loading_message(content.data);
            break;

        default:
            return content
    }

    return content
}

function send_pong() {
    send_message('pong')
}


function read_popup_message(message) {

    PopUp.confirm(message.content, {
        on_yes: () => (message.callback ? window[data.callback]() : null)
    }).open();
}

function read_toast_message(message) {
    if (message.type == 'server-error') {
        Toast.error(message.content, 6000);
        LoadingScreen.hide()
    
    } else
        Toast.info(`${message.type} - ${message.content}`); // TODO: update dynamically
}

function read_navigation_message(message) {
    const { mode, url, params, target } = message.content;

    if (mode === "reload") {
        const currentUrl = new URL(window.location.href);
        if (params && typeof params === 'object') {
            Object.entries(params).forEach(([k, v]) => {
                currentUrl.searchParams.set(k, v);
            });
        }
        window.location.href = currentUrl.toString();
    }

    else if (mode === "redirect" && url) {
        window.location.href = url;
    }

    else if (mode === "back") {
        window.history.back();
    }

    else if (mode === "open" && url) {
        const t = target || '_blank';
        window.open(url, t);
    }
}

function read_loading_message(message) {
    // message.content should contain { action, main_steps, detail }

    const action = message.content.action;
    if (action === "show") {
        LoadingScreen.show();
        LoadingScreen.update(message.content);
    } else if (action === "update") {
        LoadingScreen.update(message.content);
    } else if (action === "hide") {
        LoadingScreen.hide();
    }
}
