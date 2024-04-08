import jwt from 'jsonwebtoken'
const JWT_SECRET = 'my_jwt_secret_for_ordobank'; // Ideally, use environment variables for secrets
import { database } from "./db"

let notProtectedPath = ["/login", "/", "/newaccount", "/swear", "/swearprint"]

export const login = async (name, password) => {
    name = name.trim().toUpperCase()
    const account = await database.collection('accounts').findOne({ name: name, password: password })
    if (account) {
        const token = jwt.sign({ iban: account.iban, name: account.name }, JWT_SECRET, { expiresIn: '2y' })
        return token
    }
    return null
}

export const authMiddleware = (req, res, next) => {

    // if req.url is in notProtectedPath (or unprotected url)
    if (notProtectedPath.indexOf(req._parsedUrl.pathname) >= 0)
    {
        // Not in the protected paths so we can skip the auth
        next()
        return
    }

    const tokenQuery = req.query.token 
    const tokenPayload = req.body.token 
    const tokenHeader = req.headers.authorization
    const token = tokenQuery || tokenPayload || tokenHeader

    if (token) {
        jwt.verify(token, JWT_SECRET, (err, acc) => {
            if (err) {
                return res.sendStatus(403)
            }
            req.account = acc // { id: user.id, uri: user.uri }
            next()
        })
    } else {
        res.sendStatus(401)
    }
}
