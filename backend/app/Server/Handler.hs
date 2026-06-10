{-# LANGUAGE DataKinds #-}
{-# LANGUAGE TypeApplications #-}
{-# LANGUAGE TypeOperators #-}
{-# LANGUAGE OverloadedStrings #-}

module Server.Handler where

import Control.Monad.Error.Class (throwError)
import Control.Monad.IO.Class (liftIO)
import Data.Proxy
import Network.Wai
import Servant.API
import Servant.Server
import Database.PostgreSQL.Simple (Connection)
import Types.Models
import Database.Queries

type API =
       "hello" :> Get '[PlainText] String
  :<|> "users" :> Get '[JSON] [Users]
  :<|> "users" :> Capture "id" Int :> Get '[JSON] Users
  :<|> "users" :> ReqBody '[JSON] Users :> Post '[JSON] Users
  :<|> "users" :> Capture "id" Int :> ReqBody '[JSON] Users :> Put '[JSON] Users
  :<|> "posts" :> Get '[JSON] [Posts]
  :<|> "users" :> Capture "id" Int :> "posts" :> Get '[JSON] [Posts]
  :<|> "posts" :> Capture "id" Int :> Get '[JSON] Posts
  :<|> "posts" :> ReqBody '[JSON] Posts :> Post '[JSON] Posts
  :<|> "posts" :> Capture "id" Int :> ReqBody '[JSON] Posts :> Put '[JSON] Posts
  :<|> "posts" :> Capture "id" Int :> DeleteNoContent
  :<|> "comments" :> "post" :> Capture "postId" Int :> Get '[JSON] [Comments]
  :<|> "comments" :> ReqBody '[JSON] Comments :> Post '[JSON] Comments
  :<|> "comments" :> Capture "id" Int :> ReqBody '[JSON] Comments :> Put '[JSON] Comments
  :<|> "likes" :> Get '[JSON] [Likes]
  :<|> "likes" :> ReqBody '[JSON] Likes :> Post '[JSON] Likes
  :<|> "likes" :> Capture "id" Int :> ReqBody '[JSON] Likes :> Put '[JSON] Likes
  :<|> "likes" :> Capture "id" Int :> DeleteNoContent
  :<|> "favorites" :> Get '[JSON] [Favorites]
  :<|> "favorites" :> ReqBody '[JSON] Favorites :> Post '[JSON] Favorites
  :<|> "favorites" :> Capture "id" Int :> ReqBody '[JSON] Favorites :> Put '[JSON] Favorites
  :<|> "favorites" :> Capture "id" Int :> DeleteNoContent
  :<|> "follows" :> Get '[JSON] [Follows]
  :<|> "follows" :> ReqBody '[JSON] Follows :> Post '[JSON] Follows
  :<|> "follows" :> Capture "id" Int :> ReqBody '[JSON] Follows :> Put '[JSON] Follows
  :<|> "follows" :> Capture "id" Int :> DeleteNoContent

handlerHello :: Handler String
handlerHello = pure "Ola, mundo!"

handlerUsers :: Connection -> Handler [Users]
handlerUsers conn = liftIO (getAllUsers conn)

handlerUserById :: Connection -> Int -> Handler Users
handlerUserById conn uid = do
  mUser <- liftIO (getUserById conn uid)
  maybe (throwError err404) pure mUser

handlerCreateUser :: Connection -> Users -> Handler Users
handlerCreateUser conn user = liftIO (createUser conn user)

handlerUpdateUser :: Connection -> Int -> Users -> Handler Users
handlerUpdateUser conn uid user = do
  mUser <- liftIO (updateUser conn uid user)
  maybe (throwError err404) pure mUser

handlerPosts :: Connection -> Handler [Posts]
handlerPosts conn = liftIO (getAllPosts conn)

handlerPostsByUser :: Connection -> Int -> Handler [Posts]
handlerPostsByUser conn uid = liftIO (getPostsByUser conn uid)

handlerPostById :: Connection -> Int -> Handler Posts
handlerPostById conn pid = do
  mPost <- liftIO (getPostById conn pid)
  maybe (throwError err404) pure mPost

handlerCreatePost :: Connection -> Posts -> Handler Posts
handlerCreatePost conn post = liftIO (createPost conn post)

handlerUpdatePost :: Connection -> Int -> Posts -> Handler Posts
handlerUpdatePost conn pid post = do
  mPost <- liftIO (updatePost conn pid post)
  maybe (throwError err404) pure mPost

handlerDeletePost :: Connection -> Int -> Handler NoContent
handlerDeletePost conn pid = liftIO (deletePost conn pid) >> pure NoContent

handlerCommentsByPost :: Connection -> Int -> Handler [Comments]
handlerCommentsByPost conn pid = liftIO (getCommentsByPost conn pid)

handlerCreateComment :: Connection -> Comments -> Handler Comments
handlerCreateComment conn comment = liftIO (createComment conn comment)

handlerUpdateComment :: Connection -> Int -> Comments -> Handler Comments
handlerUpdateComment conn cid comment = do
  mComment <- liftIO (updateComment conn cid comment)
  maybe (throwError err404) pure mComment

handlerLikes :: Connection -> Handler [Likes]
handlerLikes conn = liftIO (getAllLikes conn)

handlerCreateLike :: Connection -> Likes -> Handler Likes
handlerCreateLike conn like = liftIO (createLike conn like)

handlerUpdateLike :: Connection -> Int -> Likes -> Handler Likes
handlerUpdateLike conn lid like = do
  mLike <- liftIO (updateLike conn lid like)
  maybe (throwError err404) pure mLike

handlerDeleteLike :: Connection -> Int -> Handler NoContent
handlerDeleteLike conn lid = liftIO (deleteLike conn lid) >> pure NoContent

handlerFavorites :: Connection -> Handler [Favorites]
handlerFavorites conn = liftIO (getAllFavorites conn)

handlerCreateFavorite :: Connection -> Favorites -> Handler Favorites
handlerCreateFavorite conn fav = liftIO (createFavorite conn fav)

handlerUpdateFavorite :: Connection -> Int -> Favorites -> Handler Favorites
handlerUpdateFavorite conn fid fav = do
  mFav <- liftIO (updateFavorite conn fid fav)
  maybe (throwError err404) pure mFav

handlerDeleteFavorite :: Connection -> Int -> Handler NoContent
handlerDeleteFavorite conn fid = liftIO (deleteFavorite conn fid) >> pure NoContent

handlerFollows :: Connection -> Handler [Follows]
handlerFollows conn = liftIO (getAllFollows conn)

handlerCreateFollow :: Connection -> Follows -> Handler Follows
handlerCreateFollow conn follow = liftIO (createFollow conn follow)

handlerUpdateFollow :: Connection -> Int -> Follows -> Handler Follows
handlerUpdateFollow conn fid follow = do
  mFollow <- liftIO (updateFollow conn fid follow)
  maybe (throwError err404) pure mFollow

handlerDeleteFollow :: Connection -> Int -> Handler NoContent
handlerDeleteFollow conn fid = liftIO (deleteFollow conn fid) >> pure NoContent

server :: Connection -> Server API
server conn =
       handlerHello
  :<|> handlerUsers conn
  :<|> handlerUserById conn
  :<|> handlerCreateUser conn
  :<|> handlerUpdateUser conn
  :<|> handlerPosts conn
  :<|> handlerPostsByUser conn
  :<|> handlerPostById conn
  :<|> handlerCreatePost conn
  :<|> handlerUpdatePost conn
  :<|> handlerDeletePost conn
  :<|> handlerCommentsByPost conn
  :<|> handlerCreateComment conn
  :<|> handlerUpdateComment conn
  :<|> handlerLikes conn
  :<|> handlerCreateLike conn
  :<|> handlerUpdateLike conn
  :<|> handlerDeleteLike conn
  :<|> handlerFavorites conn
  :<|> handlerCreateFavorite conn
  :<|> handlerUpdateFavorite conn
  :<|> handlerDeleteFavorite conn
  :<|> handlerFollows conn
  :<|> handlerCreateFollow conn
  :<|> handlerUpdateFollow conn
  :<|> handlerDeleteFollow conn

app :: Connection -> Application
app conn = serve (Proxy @API) (server conn)
