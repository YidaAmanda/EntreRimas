{-# LANGUAGE DataKinds #-}
{-# LANGUAGE TypeApplications #-}
{-# LANGUAGE TypeOperators #-}
{-# LANGUAGE OverloadedStrings #-}

module Server.Handler where 

import Data.Proxy
import Network.Wai
import Servant.API  
import Servant.Server
import Types.Models

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
     :<|> "likes" :> ReqBody '[JSON] Likes :> Post '[JSON] Likes
     :<|> "likes" :> Capture "id" Int :> ReqBody '[JSON] Likes :> Put '[JSON] Likes
     :<|> "likes" :> Capture "id" Int :> DeleteNoContent
     :<|> "favorites" :> ReqBody '[JSON] Favorites :> Post '[JSON] Favorites
     :<|> "favorites" :> Capture "id" Int :> ReqBody '[JSON] Favorites :> Put '[JSON] Favorites
     :<|> "favorites" :> Capture "id" Int :> DeleteNoContent
     :<|> "follows" :> ReqBody '[JSON] Follows :> Post '[JSON] Follows
     :<|> "follows" :> Capture "id" Int :> ReqBody '[JSON] Follows :> Put '[JSON] Follows
     :<|> "follows" :> Capture "id" Int :> DeleteNoContent

handlerHello :: Handler String
handlerHello = pure "Ola, mundo!"

handlerUsers :: Handler [Users]
handlerUsers = pure []

handlerUserById :: Int -> Handler Users
handlerUserById userId = pure (Users userId "Usuario exemplo" "senha-exemplo")

handlerCreateUser :: Users -> Handler Users
handlerCreateUser user = pure user

handlerUpdateUser :: Int -> Users -> Handler Users
handlerUpdateUser userId user = pure user { id_user = userId }

handlerPosts :: Handler [Posts]
handlerPosts = pure []

handlerPostsByUser :: Int -> Handler [Posts]
handlerPostsByUser _userId = pure []

handlerPostById :: Int -> Handler Posts
handlerPostById postId = pure (Posts postId 1 "Texto exemplo" "Titulo exemplo" "S")

handlerCreatePost :: Posts -> Handler Posts
handlerCreatePost post = pure post

handlerUpdatePost :: Int -> Posts -> Handler Posts
handlerUpdatePost postId post = pure post { id_post = postId }

handlerDeletePost :: Int -> Handler NoContent
handlerDeletePost _postId = pure NoContent

handlerCommentsByPost :: Int -> Handler [Comments]
handlerCommentsByPost _postId = pure []

handlerCreateComment :: Comments -> Handler Comments
handlerCreateComment comment = pure comment

handlerUpdateComment :: Int -> Comments -> Handler Comments
handlerUpdateComment commentId comment = pure comment { id_comment = commentId }

handlerCreateLike :: Likes -> Handler Likes
handlerCreateLike like = pure like

handlerUpdateLike :: Int -> Likes -> Handler Likes
handlerUpdateLike likeId like = pure like { id_like = likeId }

handlerDeleteLike :: Int -> Handler NoContent
handlerDeleteLike _likeId = pure NoContent

handlerCreateFavorite :: Favorites -> Handler Favorites
handlerCreateFavorite favorite = pure favorite

handlerUpdateFavorite :: Int -> Favorites -> Handler Favorites
handlerUpdateFavorite favoriteId favorite = pure favorite { id_favorite = favoriteId }

handlerDeleteFavorite :: Int -> Handler NoContent
handlerDeleteFavorite _favoriteId = pure NoContent

handlerCreateFollow :: Follows -> Handler Follows
handlerCreateFollow follow = pure follow

handlerUpdateFollow :: Int -> Follows -> Handler Follows
handlerUpdateFollow followId follow = pure follow { id_follow = followId }

handlerDeleteFollow :: Int -> Handler NoContent
handlerDeleteFollow _followId = pure NoContent

server :: Server API
server =
       handlerHello
  :<|> handlerUsers
  :<|> handlerUserById
  :<|> handlerCreateUser
  :<|> handlerUpdateUser
  :<|> handlerPosts
  :<|> handlerPostsByUser
  :<|> handlerPostById
  :<|> handlerCreatePost
  :<|> handlerUpdatePost
  :<|> handlerDeletePost
  :<|> handlerCommentsByPost
  :<|> handlerCreateComment
  :<|> handlerUpdateComment
  :<|> handlerCreateLike
  :<|> handlerUpdateLike
  :<|> handlerDeleteLike
  :<|> handlerCreateFavorite
  :<|> handlerUpdateFavorite
  :<|> handlerDeleteFavorite
  :<|> handlerCreateFollow
  :<|> handlerUpdateFollow
  :<|> handlerDeleteFollow

app :: Application
app = serve (Proxy @API) server
