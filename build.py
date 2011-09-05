#!/usr/bin/env python2.7
# -*- coding: utf-8 -*-

from __future__ import print_function
import os, sys, zipfile, re
from fnmatch import fnmatchcase
from xml.dom.minidom import parse as parse_xml
import xpath

extension_path = os.path.dirname(os.path.abspath(__file__)) if len(sys.argv) == 1 else sys.argv[1]
include_patterns = {
	"COPYING",
	"bootstrap.js",
	"stylesheet.css",
	"icon*.png",
	"threadicons/*.png",
	"options.xul"
}

install_rdf = "install.rdf"
include_patterns.add(install_rdf)

os.chdir(extension_path)

#infos holen
rdf_tree = parse_xml(install_rdf)
context = xpath.XPathContext(rdf_tree)
root = rdf_tree.documentElement

name    = context.findvalue("//em:id", rdf_tree)
version = context.findvalue("//em:version", rdf_tree)

descr_node = context.findnode("//Description", rdf_tree)

for old_resource in context.find("//Description/child::*", rdf_tree):
	if old_resource.tagName.endswith("URL"):
		descr_node.removeChild(old_resource)

rdf_filename = "%s-%s.xpi" % (name, version)
if os.path.isfile(rdf_filename):
	os.unlink(rdf_filename)

#schnüren der extension und entfernen von backups
with zipfile.ZipFile(rdf_filename, "w") as xpi_file:
	for dirpath, dirnames, filenames in os.walk("."):
		for filename in filenames:
			filepath = os.path.normpath(os.path.join(dirpath, filename))
			if any(fnmatchcase(filepath, pattern) for pattern in include_patterns):
				xpi_file.write(filepath)
				resource = rdf_tree.createElement("em:%sURL" % re.sub(r"\.\w+$", "", filepath.replace(os.path.sep, "_").replace(" ","_")))
				resource.appendChild(rdf_tree.createTextNode("resource://mdebw/"+filepath))
				descr_node.appendChild(resource)
			elif filepath.endswith("~"):
				os.unlink(filepath)
			#else:
				#print("mismatch:", filepath)

# leere textknoten entfernen, da das toprettyxml nicht tut
for no_text in context.find("//text()[normalize-space() = '']", rdf_tree):
	no_text.parentNode.removeChild(no_text)

pretty_xml = rdf_tree.toprettyxml(indent='\t')

# textknoten normalisieren, da das toprettyxml nicht tut
# http://stackoverflow.com/questions/749796/pretty-printing-xml-in-python#answer-3367423
text_re = re.compile('>\n\s+([^<>\s].*?)\n\s+</', re.DOTALL)
pretty_xml = text_re.sub('>\g<1></', pretty_xml)

with open(install_rdf, "w") as irdf:
	irdf.write(pretty_xml)