

# oauth 2 (keep it simple stupids)
## Design goals:
>This will auto generate the end points that are needed. <br>
>Integrate with express<br>
>create an end point a client browser can pull from to get the available list of client end points from<br>
>Be kept as simple as possible while remaining as hard as possible to fudge up <br>

## The new update changed one thing
>The burden of redirecting a user if they're not logged in is now on you yourself. <br>
>If a user is logged in then this middleware will add (.loggedIn = "true") to the request object<br>
