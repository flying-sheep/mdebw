import {html} from 'lit-html'


export default ({icon, text, shortcut, onclick}) => html`
    <div class=panel-list-item onclick=${onclick}>
        <div class=icon>${icon ? html`<img src=${icon}>` : null}</div>
        <div class=text>${text}</div>
        <div class=text-shortcut>${shortcut}</div>
    </div>
`
