{-# LANGUAGE OverloadedStrings #-}

module Main where

import qualified Data.ByteString as BS
import Network.Wai (Application, rawPathInfo)
import Network.Wai.Application.Static (defaultWebAppSettings, staticApp)
import Network.Wai.Handler.Warp (run)
import Network.Wai.Middleware.Cors
import Server.Handler (app)
import Database.Queries (connectDB)
import System.Environment (lookupEnv)
import Text.Read (readMaybe)

corsPolicy :: CorsResourcePolicy
corsPolicy = simpleCorsResourcePolicy
  { corsOrigins        = Nothing
  , corsMethods        = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
  , corsRequestHeaders = ["Content-Type", "Authorization"]
  }

apiPrefixes :: [BS.ByteString]
apiPrefixes = ["/hello", "/users", "/posts", "/comments", "/likes", "/favorites", "/follows"]

withStatic :: Application -> Application
withStatic apiApp req respond
  | any (`BS.isPrefixOf` rawPathInfo req) apiPrefixes = apiApp req respond
  | otherwise = staticApp (defaultWebAppSettings "frontend") req respond

main :: IO ()
main = do
  conn    <- connectDB
  portEnv <- lookupEnv "PORT"
  let port = maybe 8080 (maybe 8080 id . readMaybe) portEnv
  run port (cors (const (Just corsPolicy)) (withStatic (app conn)))
