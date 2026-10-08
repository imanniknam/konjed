import sys
from PIL import Image
# usage: tiles.py out.png n_tiles_per_file file1 file2 ... — real-scale viewport tiles side by side
out=sys.argv[1]; n=int(sys.argv[2]); files=sys.argv[3:]
ts=[]
for f in files:
    im=Image.open(f).convert('RGB')
    for k in range(min(n,-(-im.height//844))): ts.append(im.crop((0,k*844,im.width,min(im.height,(k+1)*844))))
w=ts[0].width; o=Image.new('RGB',(w*len(ts),max(t.height for t in ts)),(30,30,30))
for i,t in enumerate(ts): o.paste(t,(i*w,0))
o.save(out); print(out,o.size)
