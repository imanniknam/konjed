import sys,glob,os
from PIL import Image
# usage: sheet.py "glob" out.png [cols] [tile_w] [tile_h_px_of_source] — slices tall images into viewport tiles
pat,out=sys.argv[1],sys.argv[2]
cols=int(sys.argv[3]) if len(sys.argv)>3 else 4
tw=int(sys.argv[4]) if len(sys.argv)>4 else 260
th=int(sys.argv[5]) if len(sys.argv)>5 else 844
tiles=[]
for f in sorted(glob.glob(pat)):
    im=Image.open(f).convert('RGB'); n=max(1,-(-im.height//th))
    for k in range(min(n,6)): tiles.append(im.crop((0,k*th,im.width,min(im.height,(k+1)*th))))
    tiles.append(None)
ims=[]
for t in tiles:
    if t is None: ims.append(Image.new('RGB',(tw,int(th*tw/390)),(40,40,40))); continue
    ims.append(t.resize((tw,int(t.height*tw/t.width))))
rows=(len(ims)+cols-1)//cols; h=max(i.height for i in ims)
sh=Image.new('RGB',(cols*tw,rows*h))
for k,i in enumerate(ims): sh.paste(i,((k%cols)*tw,(k//cols)*h))
sh.save(out)
