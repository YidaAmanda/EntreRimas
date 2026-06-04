module Types.Models where


data User = User{
    id_user :: Int,
    nome :: String,
    senha :: String
}

data Post = Post{
    id_post :: Int,
    id_user :: Int,
    texto :: String,
    ic_comment :: String
}

data Follow = Follow{
    id_follow :: Int,
    id_seguidor :: Int,
    id_seguido :: Int
}

data Favorite = Favorite{
    id_favorite :: Int,
    id_user :: Int,
    id_post :: Int
}

data Comment = Comment{
    id_comment :: Int,
    id_user :: Int,
    id_post :: Int,
    texto :: String
}

data Like = Like{
    id_like :: Int,
    id_user :: Int,
    id_post :: Int
}