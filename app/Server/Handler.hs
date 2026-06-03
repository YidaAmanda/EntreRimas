{-# LANGUAGE DataKinds #-}
{-# LANGUAGE TypeApplications #-}
{-# LANGUAGE TypeOperators #-}
{-# LANGUAGE OverloadedStrings #-}

module Server.Handler where 

import Data.Proxy
import Network.Wai
import Servant.API.Sub
import Servant.API  
import Servant.Server

type API =
            "hello" :> Get '[PlainText] String

handlerHello :: Handler String
handlerHello = pure "Ola, mundo!"

server :: Server API
server = handlerHello

app :: Application
app = serve (Proxy @API) server
