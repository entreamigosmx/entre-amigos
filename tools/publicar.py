# Copia la vista previa (propuesta/) a la raíz del sitio: quita la barra de vista previa y noindex y ajusta rutas.
import re, os, shutil, glob
P="propuesta"
for f in glob.glob(P+"/*.html"):
    s=open(f).read()
    s=re.sub(r'<div class="preview-bar">.*?</div>\n?','',s)
    s=s.replace('<meta name="robots" content="noindex">\n','').replace('<meta name="robots" content="noindex">','')
    s=s.replace('"../','"')
    s=s.replace("'../","'")
    open(os.path.basename(f),"w").write(s)
for f in glob.glob(P+"/js/*.js"):
    s=open(f).read().replace('export const BASE = "../";','export const BASE = "";')
    s=s.replace('"../','"')
    open("js/"+os.path.basename(f),"w").write(s)
shutil.copy(P+"/css/estilo.css","css/estilo.css")
